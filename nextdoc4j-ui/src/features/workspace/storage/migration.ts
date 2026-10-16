import { workspaceTransaction } from './database';
import {
  identityKey,
  serviceUrlForScope,
  scopeToken,
  type OperationIdentity,
  type WorkspaceScope,
} from './identity';
import { reportPersistenceFailure } from './repository';
import { sanitizeDebugDraft, type DebugDraft } from '../../playground/draft';
import type { DebugDraftRecord, OperationStateRecord, WorkspaceRecord } from './records';
import type { DocumentationSource } from '../../documentation/workspace';
import { findDocumentationOperation } from '../../documentation/workspace';
import { parseHashRoute } from '../../../lib/hash-route';
import { createServiceScope } from '../../aggregation/scope';
import type { DebugSessionCache } from '../../playground/session-cache';

interface LegacyEntry {
  key: string;
  raw: string;
  updatedAt: number;
  data: Record<string, unknown>;
}
/** Reads known legacy envelopes without deleting malformed or unknown-version records.
 * @param key Exact legacy storage key.
 * @param storage Source storage.
 * @returns Recognized envelope and original bytes for compare-before-delete.
 */
const readLegacy = (key: string, storage: Storage = localStorage): LegacyEntry | undefined => {
  const raw = storage.getItem(key);
  if (!raw) return;
  try {
    const value = JSON.parse(raw);
    if (
      value.schemaVersion !== 1 ||
      !value.data ||
      typeof value.data !== 'object' ||
      !Number.isFinite(value.updatedAt)
    )
      return;
    return { key, raw, updatedAt: value.updatedAt, data: value.data };
  } catch {
    return;
  }
};
/** Claims legacy data for the existing owner, a root deployment, or an explicitly designated backend.
 * @param appId Application receiving legacy records.
 * @returns Whether origin-level data may be migrated to this application.
 */
const ownsLegacy = async (appId: string) =>
  workspaceTransaction<boolean>(['metadata'], 'readwrite', (tx, result) => {
    const store = tx.objectStore('metadata');
    const request = store.get(['legacy-owner', 'application']);
    request.onsuccess = () => {
      if (request.result) {
        result(request.result.owner === appId);
        return;
      }
      const directory = new URL('.', globalThis.location?.href || 'http://localhost/').pathname;
      const designatedOwner = globalThis.window?.__NEXTDOC4J_CONFIG__?.legacyStorageOwner;
      const explicitlyOwned = designatedOwner === true || designatedOwner === appId;
      if (!explicitlyOwned && (designatedOwner !== undefined || directory !== '/')) {
        result(false);
        return;
      }
      store.put({ appId: 'legacy-owner', name: 'application', owner: appId });
      result(true);
    };
  });
/** Migrates the existing per-service workspace without deleting its interface memory.
 * @param scope Target stable scope.
 * @param serviceUrl Legacy document URL scope.
 * @returns Completion after verified migration; failures preserve old keys.
 */
export const migrateWorkspaceStorage = async (scope: WorkspaceScope, serviceUrl?: string) => {
  try {
    if (!(await ownsLegacy(scope.appId))) return;
    const key = `nextdoc4j:preferences:workspace:${createServiceScope(serviceUrl)}`;
    const entry = readLegacy(key);
    if (!entry || !Array.isArray(entry.data.tabs)) return;
    await workspaceTransaction<void>(['workspaces', 'metadata'], 'readwrite', (tx, done) => {
      const store = tx.objectStore('workspaces');
      const request = store.get(identityKey(scope));
      request.onsuccess = () => {
        const current = request.result as WorkspaceRecord | undefined;
        if (current && current.schemaVersion !== 1) {
          tx.abort();
          return;
        }
        if (!current || current.updatedAt < entry.updatedAt)
          store.put({
            ...entry.data,
            ...scope,
            schemaVersion: 1,
            revision: (current?.revision ?? 0) + 1,
            updatedAt: entry.updatedAt,
          });
        tx.objectStore('metadata').put({
          appId: scope.appId,
          name: `migration:${key}`,
          updatedAt: entry.updatedAt,
        });
        done(undefined);
      };
    });
    // Commit completion precedes removal; modified source bytes are never removed.
    if (localStorage.getItem(key) === entry.raw) localStorage.removeItem(key);
  } catch (error) {
    reportPersistenceFailure(error);
  }
};

/** Migrates one interface across legacy groups and media types after its document is known.
 * @param identity Target method/path identity.
 * @param requestPrefix Legacy service request prefix.
 * @param sources Loaded documents used to resolve source names and authentication fields.
 * @returns Completion; unmappable records remain available for a later migration attempt.
 */
export const migrateOperationStorage = async (
  identity: OperationIdentity,
  requestPrefix: string,
  sources: DocumentationSource[],
) => {
  try {
    if (!(await ownsLegacy(identity.appId))) return;
    const entries: LegacyEntry[] = [];
    const state: OperationStateRecord = {
      ...identity,
      schemaVersion: 1,
      revision: 1,
      updatedAt: 0,
      detailByDocument: {},
    };
    const draft: DebugDraftRecord = {
      ...identity,
      schemaVersion: 1,
      revision: 1,
      updatedAt: 0,
      bodies: {},
    };
    const auth = new Set([
      'header:authorization',
      'header:proxy-authorization',
      'header:cookie',
      'header:x-api-key',
    ]);
    for (const source of sources)
      for (const scheme of Object.values(source.document.components?.securitySchemes ?? {})) {
        if (scheme.type === 'apiKey' && scheme.in && scheme.name)
          auth.add(`${scheme.in}:${scheme.name.toLowerCase()}`);
      }
    const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!).filter(
      Boolean,
    );
    const recognized = keys
      .filter(
        (key) =>
          key.startsWith('nextdoc4j:workspace:draft:') ||
          key.startsWith('nextdoc4j:workspace:operation-detail:'),
      )
      .map((key) => readLegacy(key))
      .filter((entry): entry is LegacyEntry => Boolean(entry))
      .sort((a, b) => a.updatedAt - b.updatedAt);
    for (const entry of recognized) {
      const isDraft = entry.key.startsWith('nextdoc4j:workspace:draft:');
      const prefix = isDraft
        ? 'nextdoc4j:workspace:draft:'
        : 'nextdoc4j:workspace:operation-detail:';
      let parts: string[];
      try {
        parts = entry.key.slice(prefix.length).split(':').map(decodeURIComponent);
      } catch {
        continue;
      }
      const [scope, second, third, fourth] = parts;
      if (scope !== (requestPrefix || 'single-app')) continue;
      const method = isDraft ? second : third;
      const path = isDraft ? third : fourth;
      if (method !== identity.method || path !== identity.path) continue;
      if (isDraft) {
        if (fourth === '__session__') {
          const value = entry.data as unknown as DebugSessionCache;
          if (!value.overrides || typeof value.overrides !== 'object') continue;
          const overrides: DebugSessionCache['overrides'] = {};
          for (const [name, patch] of Object.entries(value.overrides)) {
            if (!patch || typeof patch !== 'object') continue;
            if (auth.has(name) || name.startsWith('cookie:')) {
              if (typeof patch.enabled === 'boolean') overrides[name] = { enabled: patch.enabled };
            } else
              overrides[name] = {
                ...(typeof patch.value === 'string' ? { value: patch.value } : {}),
                ...(typeof patch.enabled === 'boolean' ? { enabled: patch.enabled } : {}),
              };
          }
          draft.session = {
            credentialEpoch:
              typeof value.credentialEpoch === 'string' ? value.credentialEpoch : undefined,
            overrides,
            pathOverride: typeof value.pathOverride === 'string' ? value.pathOverride : undefined,
          };
        } else {
          if (typeof entry.data.body !== 'string') continue;
          const { body, formFields, urlEncodedFields, ...common } = sanitizeDebugDraft(
            entry.data as unknown as DebugDraft,
          );
          common.headers = common.headers.filter(
            (item) => !auth.has(`header:${item.name.toLowerCase()}`),
          );
          common.queryParams = common.queryParams.filter(
            (item) => !auth.has(`query:${item.name.toLowerCase()}`),
          );
          draft.common = common;
          draft.bodies[fourth] = { body, formFields, urlEncodedFields };
        }
        draft.updatedAt = entry.updatedAt;
      } else {
        const source = sources.find(
          (source) =>
            source.id === second ||
            source.name === second ||
            source.documentUrl === second ||
            second.endsWith(`:${source.documentUrl}`),
        );
        if (!source || !entry.data.requestVariants || !entry.data.responseVariants) continue;
        state.detailByDocument[source.documentUrl] =
          entry.data as unknown as OperationStateRecord['detailByDocument'][string];
        state.updatedAt = entry.updatedAt;
      }
      entries.push(entry);
    }
    // The previous shared session envelope is retained: it also owns unrelated UI state.
    const session = readLegacy('nextdoc4j:session:ui', sessionStorage);
    if (session) {
      const routes = session.data.operationRoutes as Record<string, string> | undefined;
      const debugPages = session.data.debugPages as
        Record<string, OperationStateRecord['debug']> | undefined;
      const legacyScope = createServiceScope(serviceUrlForScope(identity));
      const sourceRoutes = Object.entries(routes ?? {}).filter(([key]) =>
        key.startsWith(`${legacyScope}:operation:`),
      );
      for (const [, hash] of sourceRoutes) {
        if (typeof hash !== 'string') continue;
        const route = parseHashRoute(hash);
        // Service route matching must not use another service's identical path.
        const operation = findDocumentationOperation(
          sources,
          route.sourceGroupId,
          route.operationId,
          route.operationPath,
          route.operationMethod,
        );
        if (!operation || operation.method !== identity.method || operation.path !== identity.path)
          continue;
        state.page = route.debug ? 'debug' : 'detail';
        state.lastRoute = hash;
        state.debug = debugPages?.[hash.replace(/\/debug$/, '')];
        state.updatedAt = Math.max(state.updatedAt, session.updatedAt);
      }
    }
    if (!entries.length && !state.updatedAt) return;
    let legacyDraftCleared = false;
    await workspaceTransaction<void>(
      ['operationStates', 'debugDrafts', 'metadata'],
      'readwrite',
      (tx, done) => {
        for (const [name, incoming] of [
          ['operationStates', state],
          ['debugDrafts', draft],
        ] as const) {
          if (!incoming.updatedAt) continue;
          const store = tx.objectStore(name);
          const request = store.get(identityKey(identity));
          request.onsuccess = () => {
            const current = request.result;
            if (current && current.schemaVersion !== 1) {
              tx.abort();
              return;
            }
            const incomingWins = !current || current.updatedAt < incoming.updatedAt;
            const merged = incomingWins ? { ...current, ...incoming } : { ...incoming, ...current };
            /** Writes the merged legacy record only if no explicit clear invalidated it.
             * @param None; consumes the validated current and incoming records.
             * @returns Nothing; queues the record in the migration transaction.
             */
            const commit = () => {
              store.put({
                ...merged,
                ...(name === 'debugDrafts'
                  ? {
                      bodies: incomingWins
                        ? { ...current?.bodies, ...draft.bodies }
                        : { ...draft.bodies, ...current?.bodies },
                    }
                  : {
                      detailByDocument: incomingWins
                        ? { ...current?.detailByDocument, ...state.detailByDocument }
                        : { ...state.detailByDocument, ...current?.detailByDocument },
                    }),
                revision: (current?.revision ?? 0) + 1,
              });
            };
            if (name !== 'debugDrafts') {
              commit();
              return;
            }
            const clearNames = [
              'clear:app',
              `clear:service:${identity.serviceKey}`,
              `clear:operation:${JSON.stringify(identityKey(identity).slice(1))}`,
            ];
            let remaining = clearNames.length;
            for (const clearName of clearNames) {
              const clear = tx.objectStore('metadata').get([identity.appId, clearName]);
              clear.onsuccess = () => {
                legacyDraftCleared ||= (clear.result?.generation ?? 0) > 0;
                if (--remaining === 0 && !legacyDraftCleared) commit();
              };
            }
          };
        }
        tx.objectStore('metadata').put({
          appId: identity.appId,
          name: `migration:${JSON.stringify(identityKey(identity))}`,
          updatedAt: Date.now(),
        });
        done(undefined);
      },
    );
    for (const entry of entries) {
      if (!legacyDraftCleared && entry.key.endsWith(':__session__')) {
        const temporary = readLegacy(entry.key, sessionStorage);
        if (temporary && temporary.data.credentialEpoch === draft.session?.credentialEpoch) {
          const overrides = temporary.data.overrides as DebugSessionCache['overrides'] | undefined;
          const safeOverrides = Object.fromEntries(
            Object.entries(overrides ?? {}).filter(
              ([name, patch]) =>
                (auth.has(name) || name.startsWith('cookie:')) && typeof patch?.value === 'string',
            ),
          );
          const nextKey = `nextdoc4j:workspace:draft:${[scopeToken(identity), identity.method, identity.path, '__session__'].map(encodeURIComponent).join(':')}`;
          sessionStorage.setItem(
            nextKey,
            JSON.stringify({
              schemaVersion: 1,
              appVersion: 'migration',
              updatedAt: temporary.updatedAt,
              data: { credentialEpoch: draft.session?.credentialEpoch, overrides: safeOverrides },
            }),
          );
          if (sessionStorage.getItem(entry.key) === temporary.raw)
            sessionStorage.removeItem(entry.key);
        }
      }
      if (localStorage.getItem(entry.key) === entry.raw) localStorage.removeItem(entry.key);
    }
  } catch (error) {
    reportPersistenceFailure(error);
  }
};

/** Migrates small application settings only when the origin-level legacy owner is unambiguous.
 * @param target Namespaced LocalStorage view.
 * @param sessionTarget Namespaced SessionStorage view.
 * @param appId Current backend application identity.
 * @returns Completion after copying and verifying owned settings, preserving all unknown data.
 */
export const migrateApplicationSettings = async (
  target: Storage,
  sessionTarget: Storage,
  appId: string,
) => {
  try {
    if (!(await ownsLegacy(appId))) return;
    for (const [source, destination] of [
      [localStorage, target],
      [sessionStorage, sessionTarget],
    ] as const) {
      const keys = Array.from({ length: source.length }, (_, i) => source.key(i)!).filter(Boolean);
      for (const key of keys) {
        if (!(
          key === 'nextdoc4j:preferences' ||
          key === 'nextdoc4j:workspace:defaults' ||
          key.startsWith('nextdoc4j:workspace:scope:') ||
          key.startsWith('nextdoc4j:session:auth:') ||
          key === 'nextdoc4j:session:ui'
        ))
          continue;
        const raw = source.getItem(key);
        if (!raw || destination.getItem(key)) continue;
        if (key === 'nextdoc4j:session:ui') {
          try {
            const envelope = JSON.parse(raw);
            delete envelope.data.operationRoutes;
            delete envelope.data.debugPages;
            destination.setItem(key, JSON.stringify(envelope));
          } catch {
            continue;
          }
        } else destination.setItem(key, raw);
        // Shared session UI is retained until its per-interface states have been migrated.
        if (
          key !== 'nextdoc4j:session:ui' &&
          destination.getItem(key) === raw &&
          source.getItem(key) === raw
        )
          source.removeItem(key);
      }
    }
  } catch (error) {
    reportPersistenceFailure(error);
  }
};

/** Imports owned legacy service records before scoped counts or explicit clearing can observe them.
 * @param scope Target stable service scope.
 * @param requestPrefix Legacy request prefix.
 * @param sources Loaded service documents used for safe ownership and credential filtering.
 * @returns Completion; unknown records are retained, and imported bodies are not kept in UI memory.
 */
export const migrateServiceStorage = async (
  scope: WorkspaceScope,
  requestPrefix: string,
  sources: DocumentationSource[],
) => {
  const identities = new Map<string, OperationIdentity>();
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index)!;
      const prefix = key.startsWith('nextdoc4j:workspace:draft:')
        ? 'nextdoc4j:workspace:draft:'
        : key.startsWith('nextdoc4j:workspace:operation-detail:')
          ? 'nextdoc4j:workspace:operation-detail:'
          : undefined;
      if (!prefix) continue;
      try {
        const parts = key.slice(prefix.length).split(':').map(decodeURIComponent);
        if (parts[0] !== (requestPrefix || 'single-app')) continue;
        const method = parts[prefix.includes('operation-detail') ? 2 : 1];
        const path = parts[prefix.includes('operation-detail') ? 3 : 2];
        if (
          !sources.some((source) =>
            source.operations.some(
              (operation) => operation.method === method && operation.path === path,
            ),
          )
        )
          continue;
        identities.set(JSON.stringify([method, path]), { ...scope, method, path });
      } catch {
        /* Unknown key formats remain untouched. */
      }
    }
    for (const identity of identities.values())
      await migrateOperationStorage(identity, requestPrefix, sources);
  } catch (error) {
    reportPersistenceFailure(error);
  }
};

/** Removes recognized legacy drafts only after a user explicitly clears the owning app or service.
 * @param appId Application whose legacy ownership was established during migration.
 * @param requestPrefix Optional legacy service prefix; omitted for an application-wide clear.
 * @param serviceKey Stable service identity used to remove temporary credential entries.
 * @returns Number of distinct legacy interfaces removed; unknown application ownership is preserved.
 */
export const clearOwnedLegacyDrafts = async (
  appId: string,
  requestPrefix?: string,
  serviceKey?: string,
) => {
  const legacyOwned = await ownsLegacy(appId);
  const removed = new Set<string>();
  for (const storage of [localStorage, sessionStorage]) {
    const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i)!).filter(Boolean);
    for (const key of keys) {
      if (!key.startsWith('nextdoc4j:workspace:draft:')) continue;
      let parts: string[];
      try {
        parts = key.slice('nextdoc4j:workspace:draft:'.length).split(':').map(decodeURIComponent);
      } catch {
        continue;
      }
      // New temporary credential keys contain a structured application/service scope.
      if (parts[0]?.startsWith('[')) {
        try {
          const token = JSON.parse(parts[0]) as string[];
          if (token[0] !== appId || (requestPrefix !== undefined && token[1] !== serviceKey))
            continue;
        } catch {
          continue;
        }
      } else if (
        !legacyOwned ||
        (requestPrefix !== undefined && parts[0] !== (requestPrefix || 'single-app'))
      )
        continue;
      if (parts.length !== 4) continue;
      storage.removeItem(key);
      removed.add(JSON.stringify(parts.slice(0, 3)));
    }
  }
  return removed.size;
};
