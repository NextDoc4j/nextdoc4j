import { readWorkspaceRecord, workspaceTransaction, type WorkspaceStore } from './database';
import { identityKey, type OperationIdentity, type WorkspaceScope } from './identity';
import type {
  ClearGeneration,
  DebugDraftRecord,
  OperationStateRecord,
  WorkspaceRecord,
} from './records';

export type { DebugDraftRecord, OperationStateRecord, WorkspaceRecord } from './records';
type UserRecord = WorkspaceRecord | OperationStateRecord | DebugDraftRecord;
type RecordPatch = Partial<WorkspaceRecord & OperationStateRecord & DebugDraftRecord> & {
  removedOverrides?: string[];
};
interface PendingWrite {
  store: WorkspaceStore;
  identity: WorkspaceScope | OperationIdentity;
  patch: RecordPatch;
  generation?: ClearGeneration;
}
const workspaces = new Map<string, WorkspaceRecord>();
const states = new Map<string, OperationStateRecord>();
const drafts = new Map<string, DebugDraftRecord>();
const generations = new Map<string, ClearGeneration>();
const loadedOperations = new Set<string>();
const pending = new Map<string, PendingWrite>();
const preparing = new Map<string, Promise<void>>();
let timer: ReturnType<typeof setTimeout> | undefined;
let flushing: Promise<void> | undefined;
let failure = '';
const listeners = new Set<() => void>();

const activeOperations = new Map<string, number>();
const releasedOperations = new Set<string>();

/** Releases inactive hydrated data only after all queued writes and reads finish.
 * @param None; reads active ownership and persistence queues.
 * @returns Nothing; persisted records and unsaved data remain intact.
 */
const releaseInactiveOperations = (): void => {
  for (const key of releasedOperations) {
    if (
      activeOperations.has(key) ||
      preparing.has(key) ||
      [...pending.values()].some((write) => keyOf(write.identity) === key)
    )
      continue;
    states.delete(key);
    drafts.delete(key);
    generations.delete(key);
    loadedOperations.delete(key);
    releasedOperations.delete(key);
  }
};

/** Pins the selected interface until its owning view changes or unmounts.
 * @param identity Interface being displayed.
 * @returns Idempotent release callback preserving pending or failed saves.
 */
export const retainOperation = (identity: OperationIdentity): (() => void) => {
  const key = keyOf(identity);
  activeOperations.set(key, (activeOperations.get(key) ?? 0) + 1);
  releasedOperations.delete(key);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const remaining = (activeOperations.get(key) ?? 1) - 1;
    if (remaining > 0) activeOperations.set(key, remaining);
    else {
      activeOperations.delete(key);
      releasedOperations.add(key);
      releaseInactiveOperations();
    }
  };
};

/** Reports persistent failures without discarding the in-memory request.
 * @param error Database or migration failure.
 * @returns Nothing; publishes a stable status for the application banner.
 */
export const reportPersistenceFailure = (error: unknown) => {
  failure = `本地保存失败，当前修改暂存在内存中：${error instanceof Error ? error.message : String(error)}`;
  listeners.forEach((listener) => listener());
};
/** Reads the current persistence error.
 * @param None; reads repository status.
 * @returns Empty string when the most recent write succeeded.
 */
export const getPersistenceFailure = () => failure;
/** Subscribes the UI to storage failure changes.
 * @param listener UI update callback.
 * @returns Unsubscribe callback.
 */
export const subscribePersistence = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
/** Creates a memory-map key matching an IndexedDB composite identity.
 * @param identity Workspace or operation identity.
 * @returns Unambiguous JSON key.
 */
const keyOf = (identity: WorkspaceScope | OperationIdentity) =>
  JSON.stringify(identityKey(identity));
/** Creates the three explicit-clear counters checked by draft transactions.
 * @param identity Operation identity.
 * @returns Metadata keys for app, service and operation clearing.
 */
const generationKeys = (identity: OperationIdentity) => [
  [identity.appId, 'clear:app'],
  [identity.appId, `clear:service:${identity.serviceKey}`],
  [identity.appId, `clear:operation:${JSON.stringify(identityKey(identity).slice(1))}`],
];
/** Reads all clear counters within an existing transaction.
 * @param tx Transaction including metadata.
 * @param identity Operation whose writes are being protected.
 * @param done Callback receiving all counters before the transaction completes.
 * @returns Nothing; schedules IDB reads.
 */
const readGenerations = (
  tx: IDBTransaction,
  identity: OperationIdentity,
  done: (value: ClearGeneration) => void,
) => {
  const values = [0, 0, 0];
  let remaining = 3;
  generationKeys(identity).forEach((key, index) => {
    const request = tx.objectStore('metadata').get(key);
    request.onsuccess = () => {
      values[index] = request.result?.generation ?? 0;
      if (--remaining === 0) done({ app: values[0], service: values[1], operation: values[2] });
    };
  });
};
/** Compares the generation captured when an operation was hydrated with current clear counters.
 * @param left Captured generation.
 * @param right Current generation.
 * @returns True when no explicit clear invalidated the pending write.
 */
const sameGeneration = (left: ClearGeneration | undefined, right: ClearGeneration) =>
  Boolean(
    left &&
    left.app === right.app &&
    left.service === right.service &&
    left.operation === right.operation,
  );

/** Merges concrete field updates without overwriting other body types or document selections.
 * @param current Existing record or queued fields.
 * @param patch Changed fields only.
 * @returns Merged record fields.
 */
const mergePatch = (current: RecordPatch, patch: RecordPatch): RecordPatch => ({
  ...current,
  ...patch,
  ...(current.removedOverrides || patch.removedOverrides
    ? {
        removedOverrides: [
          ...new Set([...(current.removedOverrides ?? []), ...(patch.removedOverrides ?? [])]),
        ].filter((key) => !Object.hasOwn(patch.session?.overrides ?? {}, key)),
      }
    : {}),
  ...(patch.bodies ? { bodies: { ...current.bodies, ...patch.bodies } } : {}),
  ...(patch.detailByDocument
    ? { detailByDocument: { ...current.detailByDocument, ...patch.detailByDocument } }
    : {}),
  ...(patch.common ? { common: { ...current.common, ...patch.common } } : {}),
  ...(patch.debug ? { debug: { ...current.debug, ...patch.debug } } : {}),
  ...(patch.session
    ? {
        session: {
          ...current.session,
          ...patch.session,
          overrides: Object.fromEntries(
            Object.entries({ ...current.session?.overrides, ...patch.session.overrides }).filter(
              ([key]) => !patch.removedOverrides?.includes(key),
            ),
          ),
        },
      }
    : {}),
});

/** Queues changed record fields and immediately updates the hydrated memory view.
 * @param write Typed table, identity and fields to commit.
 * @returns Nothing; schedules a bounded 150 ms commit window.
 */
const enqueue = (write: PendingWrite) => {
  const key = `${write.store}:${keyOf(write.identity)}`;
  const previous = pending.get(key);
  pending.set(key, { ...write, patch: mergePatch(previous?.patch ?? {}, write.patch) });
  if (!timer)
    timer = setTimeout(() => {
      timer = undefined;
      void flushPending().catch(reportPersistenceFailure);
    }, 150);
};

/** Commits pending fields in serial transactions, preserving them in memory on failure.
 * @param None; drains all currently queued workspace changes.
 * @returns Completion after committed writes; rejects without discarding failed items.
 */
export const flushPending = async (): Promise<void> => {
  if (timer) {
    clearTimeout(timer);
    timer = undefined;
  }
  if (flushing) {
    await flushing;
    if (pending.size) await flushPending();
    return;
  }
  flushing = (async () => {
    while (pending.size) {
      const [key, write] = pending.entries().next().value!;
      try {
        if (write.store !== 'workspaces' && !loadedOperations.has(keyOf(write.identity))) {
          throw new Error('接口缓存尚未成功读取，当前输入保留在内存中，请重试保存');
        }
        const accepted = await workspaceTransaction<boolean>(
          [write.store, 'metadata'],
          'readwrite',
          (tx, result) => {
            /** Reads and merges one record within the same write transaction.
             * @param None; uses the queued identity and field patch.
             * @returns Nothing; schedules the record write before transaction completion.
             */
            const commit = () => {
              const store = tx.objectStore(write.store);
              const request = store.get(identityKey(write.identity));
              request.onsuccess = () => {
                const current = request.result as UserRecord | undefined;
                if (current && current.schemaVersion !== 1) {
                  tx.abort();
                  return;
                }
                const defaults =
                  write.store === 'operationStates'
                    ? { detailByDocument: {} }
                    : write.store === 'debugDrafts'
                      ? { bodies: {} }
                      : {};
                const merged = mergePatch(current ?? {}, write.patch);
                delete merged.removedOverrides;
                store.put({
                  ...defaults,
                  ...merged,
                  ...write.identity,
                  schemaVersion: 1,
                  revision: (current?.revision ?? 0) + 1,
                  updatedAt: Date.now(),
                });
                result(true);
              };
            };
            if (write.store === 'debugDrafts')
              readGenerations(tx, write.identity as OperationIdentity, (value) => {
                if (!sameGeneration(write.generation, value)) {
                  result(false);
                  return;
                }
                commit();
              });
            else commit();
          },
        );
        if (!accepted) {
          drafts.delete(keyOf(write.identity));
          generations.delete(keyOf(write.identity));
          loadedOperations.delete(keyOf(write.identity));
          reportPersistenceFailure(
            new Error('该接口缓存已在其他页面清理，请重新打开接口后继续保存'),
          );
        }
        if (pending.get(key) === write) pending.delete(key);
        releaseInactiveOperations();
      } catch (error) {
        reportPersistenceFailure(error);
        throw error;
      }
    }
  })();
  try {
    await flushing;
  } finally {
    flushing = undefined;
  }
};

/** Loads one service workspace before synchronous UI restoration consumes it.
 * @param scope Stable app and service scope.
 * @returns Completion; repeated reads reuse the hydrated workspace.
 */
export const prepareWorkspace = async (scope: WorkspaceScope) => {
  const key = keyOf(scope);
  if (workspaces.has(key)) return;
  const stored = await readWorkspaceRecord<WorkspaceRecord>('workspaces', identityKey(scope));
  if (stored && (stored.schemaVersion !== 1 || !Array.isArray(stored.tabs)))
    throw new Error('工作区存储版本或格式不受支持');
  workspaces.set(
    key,
    stored ?? { ...scope, tabs: [], schemaVersion: 1, revision: 0, updatedAt: 0 },
  );
};
/** Reads a hydrated service workspace without blocking rendering.
 * @param scope Service identity.
 * @returns Last committed or pending workspace snapshot.
 */
export const readWorkspace = (scope: WorkspaceScope) => workspaces.get(keyOf(scope));
/** Updates one service workspace; tab closure never removes interface records.
 * @param scope Service identity.
 * @param patch Active route and/or ordered tabs.
 * @returns Nothing; updates memory and schedules persistence.
 */
export const writeWorkspace = (
  scope: WorkspaceScope,
  patch: Pick<WorkspaceRecord, 'tabs' | 'activeRoute'>,
) => {
  const current = readWorkspace(scope);
  if (
    JSON.stringify({ tabs: current?.tabs, activeRoute: current?.activeRoute }) ===
    JSON.stringify(patch)
  )
    return;
  workspaces.set(keyOf(scope), {
    ...scope,
    schemaVersion: 1,
    revision: current?.revision ?? 0,
    updatedAt: Date.now(),
    ...patch,
  });
  enqueue({ store: 'workspaces', identity: scope, patch });
};

/** Hydrates only the requested interface and its clear-generation snapshot.
 * @param identity Stable interface identity.
 * @returns Completion; no default state may be written before this promise settles.
 */
export const prepareOperation = async (identity: OperationIdentity): Promise<void> => {
  const key = keyOf(identity);
  const existing = preparing.get(key);
  if (existing) return existing;
  if (states.has(key) && generations.has(key)) return;
  const task = workspaceTransaction<void>(
    ['operationStates', 'debugDrafts', 'metadata'],
    'readonly',
    (tx, result) => {
      const stateRequest = tx.objectStore('operationStates').get(identityKey(identity));
      stateRequest.onsuccess = () => {
        const state = stateRequest.result as OperationStateRecord | undefined;
        if (state && (state.schemaVersion !== 1 || !state.detailByDocument)) {
          tx.abort();
          return;
        }
        states.set(
          key,
          state ?? {
            ...identity,
            detailByDocument: {},
            schemaVersion: 1,
            revision: 0,
            updatedAt: 0,
          },
        );
      };
      const draftRequest = tx.objectStore('debugDrafts').get(identityKey(identity));
      draftRequest.onsuccess = () => {
        const draft = draftRequest.result as DebugDraftRecord | undefined;
        if (draft && (draft.schemaVersion !== 1 || !draft.bodies)) {
          tx.abort();
          return;
        }
        if (draft) drafts.set(key, draft);
      };
      readGenerations(tx, identity, (value) => {
        generations.set(key, value);
        result(undefined);
      });
    },
  );
  preparing.set(key, task);
  try {
    await task;
    loadedOperations.add(key);
    for (const write of pending.values()) {
      if (keyOf(write.identity) !== key) continue;
      if (write.store === 'operationStates')
        states.set(key, {
          ...states.get(key),
          ...mergePatch(states.get(key) ?? {}, write.patch),
        } as OperationStateRecord);
      if (write.store === 'debugDrafts') {
        drafts.set(key, {
          ...identity,
          schemaVersion: 1,
          revision: 0,
          updatedAt: Date.now(),
          bodies: {},
          ...mergePatch(drafts.get(key) ?? {}, write.patch),
        } as DebugDraftRecord);
        write.generation ??= generations.get(key);
      }
    }
  } catch (error) {
    states.delete(key);
    drafts.delete(key);
    generations.delete(key);
    reportPersistenceFailure(error);
    throw error;
  } finally {
    preparing.delete(key);
    releaseInactiveOperations();
  }
};
/** Reports whether interface data is ready without scheduling another database read.
 * @param identity Interface identity.
 * @returns True after hydration commits and while its clear generation remains current.
 */
export const isOperationPrepared = (identity: OperationIdentity) =>
  loadedOperations.has(keyOf(identity)) && generations.has(keyOf(identity));

/** Reads the hydrated interface page state.
 * @param identity Interface identity.
 * @returns Page selections or undefined before hydration.
 */
export const readOperationState = (identity: OperationIdentity) => states.get(keyOf(identity));
/** Saves only changed page fields, retaining document-specific selections.
 * @param identity Interface identity.
 * @param patch Changed page state.
 * @returns Nothing; memory and persistent queue receive the same fields.
 */
export const patchOperationState = (
  identity: OperationIdentity,
  patch: Partial<
    Pick<
      OperationStateRecord,
      'page' | 'lastRoute' | 'lastEntry' | 'scroll' | 'debug' | 'detailByDocument'
    >
  >,
) => {
  const current = states.get(keyOf(identity));
  const next = {
    ...mergePatch(current ?? {}, patch),
    ...identity,
    schemaVersion: 1,
    revision: current?.revision ?? 0,
    updatedAt: Date.now(),
    detailByDocument: { ...current?.detailByDocument, ...patch.detailByDocument },
  } as OperationStateRecord;
  if (current && JSON.stringify(mergePatch(current, patch)) === JSON.stringify(current)) return;
  states.set(keyOf(identity), next);
  enqueue({ store: 'operationStates', identity, patch });
};
/** Reads an already hydrated user draft.
 * @param identity Interface identity.
 * @returns Draft containing common fields and all body branches.
 */
export const readOperationDraft = (identity: OperationIdentity) => drafts.get(keyOf(identity));
/** Compares a changed field without serializing equal references or primitive strings.
 * @param left Previously retained field.
 * @param right Incoming field.
 * @returns Whether the JSON-compatible field values are equal.
 */
const sameField = (left: unknown, right: unknown): boolean =>
  Object.is(left, right) ||
  (typeof left === 'object' &&
    left !== null &&
    typeof right === 'object' &&
    right !== null &&
    JSON.stringify(left) === JSON.stringify(right));

/** Saves changed common fields or one body branch without copying inherited global parameters.
 * @param identity Interface identity.
 * @param patch Changed request data.
 * @returns Nothing; stale clear generations are rejected at transaction commit.
 */
export const patchOperationDraft = (
  identity: OperationIdentity,
  patch: Partial<Pick<DebugDraftRecord, 'common' | 'bodies' | 'session'>>,
) => {
  const current = drafts.get(keyOf(identity));
  const changed: RecordPatch = {};
  if (patch.common)
    changed.common = Object.fromEntries(
      Object.entries(patch.common).filter(
        ([key, value]) =>
          !sameField(
            current?.common?.[key as keyof NonNullable<DebugDraftRecord['common']>],
            value,
          ),
      ),
    ) as DebugDraftRecord['common'];
  if (patch.bodies)
    changed.bodies = Object.fromEntries(
      Object.entries(patch.bodies).filter(
        ([key, value]) => !sameField(current?.bodies[key], value),
      ),
    );
  if (patch.session) {
    changed.session = {
      ...(patch.session.pathOverride !== current?.session?.pathOverride
        ? { pathOverride: patch.session.pathOverride }
        : {}),
      ...(patch.session.credentialEpoch !== current?.session?.credentialEpoch
        ? { credentialEpoch: patch.session.credentialEpoch }
        : {}),
      ...(!sameField(patch.session.preRequestConfig, current?.session?.preRequestConfig)
        ? { preRequestConfig: patch.session.preRequestConfig }
        : {}),
      ...(!sameField(patch.session.postResponseConfig, current?.session?.postResponseConfig)
        ? { postResponseConfig: patch.session.postResponseConfig }
        : {}),
      overrides: Object.fromEntries(
        Object.entries(patch.session.overrides).filter(
          ([key, value]) => !sameField(current?.session?.overrides[key], value),
        ),
      ),
    };
    changed.removedOverrides = Object.keys(current?.session?.overrides ?? {}).filter(
      (key) => !Object.hasOwn(patch.session!.overrides, key),
    );
  }
  if (
    current &&
    !Object.keys(changed.common ?? {}).length &&
    !Object.keys(changed.bodies ?? {}).length &&
    !Object.keys(changed.session?.overrides ?? {}).length &&
    !changed.removedOverrides?.length &&
    !Object.keys(changed.session ?? {}).some((key) => key !== 'overrides')
  )
    return;
  drafts.set(keyOf(identity), {
    ...mergePatch(current ?? {}, patch),
    ...(patch.session ? { session: patch.session } : {}),
    ...identity,
    bodies: { ...current?.bodies, ...patch.bodies },
    schemaVersion: 1,
    revision: current?.revision ?? 0,
    updatedAt: Date.now(),
  } as DebugDraftRecord);
  enqueue({
    store: 'debugDrafts',
    identity,
    patch: changed,
    generation: generations.get(keyOf(identity)),
  });
};

/** Counts interface drafts by app or service without loading their bodies.
 * @param scope Application, optionally restricted to one service.
 * @returns Number of saved interface drafts.
 */
export const countOperationDrafts = async (scope: { appId: string; serviceKey?: string }) => {
  await flushPending();
  return workspaceTransaction<number>(['debugDrafts'], 'readonly', (tx, result) => {
    const index = tx.objectStore('debugDrafts').index(scope.serviceKey ? 'scope' : 'appId');
    const request = index.count(scope.serviceKey ? [scope.appId, scope.serviceKey] : scope.appId);
    request.onsuccess = () => result(request.result);
  });
};
/** Explicitly clears only requested drafts and invalidates older queued writes across windows.
 * @param scope Application, service or exact interface scope.
 * @returns Number of deleted drafts after the deletion transaction commits.
 */
export const clearOperationDrafts = async (scope: {
  appId: string;
  serviceKey?: string;
  method?: string;
  path?: string;
}) => {
  /** Restricts deletion to the user's selected application, service or interface.
   * @param identity Candidate record identity.
   * @returns Whether the candidate belongs to the explicit clear request.
   */
  const matches = (identity: WorkspaceScope | OperationIdentity) =>
    identity.appId === scope.appId &&
    (!scope.serviceKey || identity.serviceKey === scope.serviceKey) &&
    (!scope.method ||
      ('method' in identity && identity.method === scope.method && identity.path === scope.path));
  for (const [key, write] of pending)
    if (write.store === 'debugDrafts' && matches(write.identity)) pending.delete(key);
  if (flushing) await flushing.catch(() => undefined);
  const name = scope.method
    ? `clear:operation:${JSON.stringify([scope.serviceKey, scope.method, scope.path])}`
    : scope.serviceKey
      ? `clear:service:${scope.serviceKey}`
      : 'clear:app';
  const count = await workspaceTransaction<number>(
    ['debugDrafts', 'metadata'],
    'readwrite',
    (tx, result) => {
      const metadata = tx.objectStore('metadata');
      const previous = metadata.get([scope.appId, name]);
      previous.onsuccess = () =>
        metadata.put({
          appId: scope.appId,
          name,
          generation: (previous.result?.generation ?? 0) + 1,
        });
      const store = tx.objectStore('debugDrafts');
      const request = store
        .index(scope.serviceKey ? 'scope' : 'appId')
        .openCursor(scope.serviceKey ? [scope.appId, scope.serviceKey] : scope.appId);
      let removed = 0;
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          result(removed);
          return;
        }
        if (matches(cursor.value)) {
          cursor.delete();
          removed++;
        }
        cursor.continue();
      };
    },
  );
  for (const [key, value] of drafts) if (matches(value)) drafts.delete(key);
  for (const [key, value] of [...states])
    if (matches(value)) {
      await workspaceTransaction<void>(['metadata'], 'readonly', (tx, done) => {
        readGenerations(tx, value, (generation) => {
          generations.set(key, generation);
          done(undefined);
        });
      });
    }
  return count;
};

/** Retries failed writes and resets the visible error only after commit.
 * @param None; uses retained pending changes.
 * @returns Completion after all pending writes succeed.
 */
export const retryPersistence = async () => {
  for (const write of pending.values()) {
    if ('method' in write.identity && !loadedOperations.has(keyOf(write.identity)))
      await prepareOperation(write.identity);
  }
  await flushPending();
  failure = '';
  listeners.forEach((listener) => listener());
};
