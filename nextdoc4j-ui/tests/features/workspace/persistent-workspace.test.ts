// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getApplicationId,
  getWorkspaceScope,
  identityKey,
  operationIdentity,
} from '../../../src/features/workspace/storage/identity';
import {
  readWorkspaceRecord,
  workspaceTransaction,
} from '../../../src/features/workspace/storage/database';
import {
  prepareOperation,
  patchOperationState,
  patchOperationDraft,
  flushPending,
  prepareWorkspace,
  writeWorkspace,
  clearOperationDrafts,
  countOperationDrafts,
  readOperationDraft,
} from '../../../src/features/workspace/storage/repository';
import type {
  DebugDraftRecord,
  OperationStateRecord,
} from '../../../src/features/workspace/storage/records';
import {
  migrateOperationStorage,
  migrateWorkspaceStorage,
} from '../../../src/features/workspace/storage/migration';
import { createDocumentationSources } from '../../../src/features/documentation/workspace';
import { createDebugDraftKey } from '../../../src/features/playground/draft';
import { createStoredEnvelope } from '../../../src/lib/storage/envelope';

const scope = (name: string) => ({ appId: `test-${name}`, serviceKey: 'single-app' });
const body = (value: string) => ({ body: value, formFields: [], urlEncodedFields: [] });
afterEach(async () => {
  await flushPending();
});

describe('permanent user workspace persistence', () => {
  it('isolates backend deployments and stable service identities', () => {
    expect(getApplicationId({ href: 'https://host/app-a/doc.html' } as Location, '')).not.toBe(
      getApplicationId({ href: 'https://host/app-b/doc.html' } as Location, ''),
    );
    const service = { serviceId: 'users', name: 'Users', url: '/users/docs' };
    expect(getWorkspaceScope(service, [service]).serviceKey).toBe(
      getWorkspaceScope({ ...service, name: 'Changed', url: '/new/docs' }, [
        { ...service, url: '/new/docs' },
      ]).serviceKey,
    );
  });

  it('closes workspace tabs without deleting interface mode or body drafts', async () => {
    const service = scope('close');
    const identity = operationIdentity(service, 'POST', '/roles');
    await prepareWorkspace(service);
    await prepareOperation(identity);
    patchOperationState(identity, {
      page: 'debug',
      debug: { debugTab: 'headers', debugBody: 'json' },
    });
    patchOperationDraft(identity, { bodies: { 'application/json': body('{"name":"saved"}') } });
    writeWorkspace(service, { tabs: [], activeRoute: '#/home' });
    await flushPending();
    expect(
      await readWorkspaceRecord<OperationStateRecord>('operationStates', identityKey(identity)),
    ).toMatchObject({ page: 'debug', debug: { debugTab: 'headers' } });
    expect(
      await readWorkspaceRecord<DebugDraftRecord>('debugDrafts', identityKey(identity)),
    ).toMatchObject({ bodies: { 'application/json': { body: '{"name":"saved"}' } } });
  });

  it('retains more than 100 drafts and isolates service clearing', async () => {
    const service = scope('capacity');
    for (let i = 0; i < 101; i++) {
      const identity = operationIdentity(service, 'get', `/users/${i}`);
      await prepareOperation(identity);
      patchOperationDraft(identity, { bodies: { json: body(String(i)) } });
    }
    const other = operationIdentity({ ...service, serviceKey: 'other' }, 'get', '/users/0');
    await prepareOperation(other);
    patchOperationDraft(other, { bodies: { json: body('other service') } });
    expect(await countOperationDrafts(service)).toBe(101);
    expect(await clearOperationDrafts(service)).toBe(101);
    expect(await countOperationDrafts({ ...service, serviceKey: 'other' })).toBe(1);
  });

  it('merges body branches written after a second window changes another branch', async () => {
    const identity = operationIdentity(scope('merge'), 'post', '/roles');
    await prepareOperation(identity);
    patchOperationDraft(identity, { bodies: { json: body('first') } });
    await flushPending();
    await workspaceTransaction<void>(['debugDrafts'], 'readwrite', (tx, done) => {
      const store = tx.objectStore('debugDrafts');
      const request = store.get(identityKey(identity));
      request.onsuccess = () => {
        store.put({
          ...request.result,
          bodies: { ...request.result.bodies, xml: body('<second/>') },
        });
        done(undefined);
      };
    });
    patchOperationDraft(identity, { bodies: { json: body('third') } });
    await flushPending();
    const saved = await readWorkspaceRecord<DebugDraftRecord>('debugDrafts', identityKey(identity));
    expect(saved?.bodies).toEqual({ json: body('third'), xml: body('<second/>') });
  });

  it('rejects a stale writer after another browser window clears the service', async () => {
    const identity = operationIdentity(scope('epoch'), 'post', '/roles');
    await prepareOperation(identity);
    patchOperationDraft(identity, { bodies: { json: body('before') } });
    await flushPending();
    await workspaceTransaction<void>(['debugDrafts', 'metadata'], 'readwrite', (tx, done) => {
      tx.objectStore('debugDrafts').delete(identityKey(identity));
      tx.objectStore('metadata').put({
        appId: identity.appId,
        name: `clear:service:${identity.serviceKey}`,
        generation: 1,
      });
      done(undefined);
    });
    patchOperationDraft(identity, { bodies: { json: body('stale') } });
    await flushPending();
    expect(await readWorkspaceRecord('debugDrafts', identityKey(identity))).toBeUndefined();
  });

  it('cancels pending draft writes during explicit clear but retains page state', async () => {
    const identity = operationIdentity(scope('pending-clear'), 'get', '/users');
    await prepareOperation(identity);
    patchOperationState(identity, { page: 'debug' });
    patchOperationDraft(identity, { bodies: { json: body('pending') } });
    await clearOperationDrafts(identity);
    await flushPending();
    expect(await readWorkspaceRecord('debugDrafts', identityKey(identity))).toBeUndefined();
    expect(
      await readWorkspaceRecord<OperationStateRecord>('operationStates', identityKey(identity)),
    ).toMatchObject({ page: 'debug' });
  });

  it('removes ordinary overrides without retaining an older queued value', async () => {
    const identity = operationIdentity(scope('override-removal'), 'get', '/users');
    await prepareOperation(identity);
    patchOperationDraft(identity, {
      session: { overrides: { 'query:page': { value: '2' }, 'header:trace': { value: 'abc' } } },
    });
    await flushPending();
    patchOperationDraft(identity, { session: { overrides: { 'header:trace': { value: 'abc' } } } });
    patchOperationDraft(identity, { session: { overrides: { 'header:trace': { value: 'new' } } } });
    await flushPending();
    expect(
      (await readWorkspaceRecord<DebugDraftRecord>('debugDrafts', identityKey(identity)))?.session
        ?.overrides,
    ).toEqual({ 'header:trace': { value: 'new' } });
  });

  it('restores independent service workspaces without sharing tab snapshots', async () => {
    const first = scope('workspaces');
    const second = { ...first, serviceKey: 'orders' };
    await prepareWorkspace(first);
    await prepareWorkspace(second);
    writeWorkspace(first, {
      tabs: [
        {
          id: 'operation:get:/users',
          label: 'Users',
          closable: true,
          pinned: true,
          route: '#/docs/operations/users',
        },
      ],
      activeRoute: '#/docs/operations/users',
    });
    writeWorkspace(second, { tabs: [], activeRoute: '#/settings/auth' });
    await flushPending();
    expect(await readWorkspaceRecord('workspaces', identityKey(first))).toMatchObject({
      tabs: [{ pinned: true }],
      activeRoute: '#/docs/operations/users',
    });
    expect(await readWorkspaceRecord('workspaces', identityKey(second))).toMatchObject({
      tabs: [],
      activeRoute: '#/settings/auth',
    });
  });

  it('preserves memory and retries a transaction failure without claiming success', async () => {
    const identity = operationIdentity(scope('failure'), 'post', '/users');
    await prepareOperation(identity);
    const spy = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementationOnce(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });
    patchOperationDraft(identity, { bodies: { json: body('unsaved') } });
    await expect(flushPending()).rejects.toBeDefined();
    expect(readOperationDraft(identity)?.bodies.json.body).toBe('unsaved');
    spy.mockRestore();
    await flushPending();
    expect(
      await readWorkspaceRecord<DebugDraftRecord>('debugDrafts', identityKey(identity)),
    ).toMatchObject({ bodies: { json: { body: 'unsaved' } } });
  });
});

describe('legacy migration', () => {
  const service = scope('migration');
  it('commits all media variants before removing old keys and strips auth values', async () => {
    const identity = operationIdentity(service, 'post', '/users');
    const sources = createDocumentationSources({
      paths: { '/users': { post: { operationId: 'create' } } },
      components: { securitySchemes: { key: { type: 'apiKey', in: 'query', name: 'token' } } },
    });
    const keys = ['application/json', 'application/xml'].map((contentType) =>
      createDebugDraftKey({ method: 'post', path: '/users', contentType }),
    );
    keys.forEach((key, i) =>
      localStorage.setItem(
        key,
        JSON.stringify(
          createStoredEnvelope(
            {
              body: String(i),
              formFields: [],
              urlEncodedFields: [],
              headers: [{ name: 'Authorization', value: 'secret', enabled: true }],
              pathParams: [],
              queryParams: [{ name: 'token', value: 'secret', enabled: true }],
            },
            1,
            i + 1,
          ),
        ),
      ),
    );
    await migrateOperationStorage(identity, '', sources);
    const saved = await readWorkspaceRecord<DebugDraftRecord>('debugDrafts', identityKey(identity));
    expect(Object.keys(saved!.bodies)).toHaveLength(2);
    expect(saved?.common?.headers).toEqual([]);
    expect(saved?.common?.queryParams).toEqual([]);
    expect(keys.map((key) => localStorage.getItem(key))).toEqual([null, null]);
    await migrateOperationStorage(identity, '', sources);
    expect(
      await readWorkspaceRecord<DebugDraftRecord>('debugDrafts', identityKey(identity)),
    ).toEqual(saved);
  });

  it('does not resurrect legacy drafts after an explicit app-wide clear', async () => {
    const identity = operationIdentity(service, 'post', '/cleared');
    await clearOperationDrafts({ appId: service.appId });
    const key = createDebugDraftKey({
      method: 'post',
      path: '/cleared',
      contentType: 'application/json',
    });
    localStorage.setItem(
      key,
      JSON.stringify(
        createStoredEnvelope(
          {
            body: 'old',
            headers: [],
            pathParams: [],
            queryParams: [],
            formFields: [],
            urlEncodedFields: [],
          },
          1,
        ),
      ),
    );
    await migrateOperationStorage(
      identity,
      '',
      createDocumentationSources({ paths: { '/cleared': { post: {} } } }),
    );
    expect(await readWorkspaceRecord('debugDrafts', identityKey(identity))).toBeUndefined();
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('preserves unmappable records and newer destination workspaces', async () => {
    const raw = JSON.stringify(createStoredEnvelope({ tabs: [], activeRoute: '#/home' }, 1, 1));
    localStorage.setItem('nextdoc4j:preferences:workspace:single-app', raw);
    await prepareWorkspace(service);
    writeWorkspace(service, { tabs: [], activeRoute: '#/settings/auth' });
    await flushPending();
    await migrateWorkspaceStorage(service);
    expect(await readWorkspaceRecord('workspaces', identityKey(service))).toMatchObject({
      activeRoute: '#/settings/auth',
    });
    const key = 'nextdoc4j:workspace:operation-detail:single-app:unknown:get:%2Fabsent';
    localStorage.setItem(
      key,
      JSON.stringify(createStoredEnvelope({ requestVariants: {}, responseVariants: {} }, 1)),
    );
    await migrateOperationStorage(operationIdentity(service, 'get', '/absent'), '', []);
    expect(localStorage.getItem(key)).not.toBeNull();
  });
});

it('persists, replaces and removes pre/post configurations in IndexedDB', async () => {
  const identity = operationIdentity(scope('pre-post'), 'post', '/login');
  await prepareOperation(identity);
  patchOperationDraft(identity, {
    session: {
      overrides: {},
      preRequestConfig: {
        steps: [
          {
            id: 'script',
            name: '脚本',
            type: 'script',
            enabled: true,
            failurePolicy: 'abort',
            scriptCode: 'console.log(1)',
          },
        ],
      },
      postResponseConfig: {
        steps: [
          {
            id: 'script',
            name: '脚本',
            type: 'script',
            enabled: true,
            failurePolicy: 'abort',
            scriptCode: 'console.log(2)',
          },
        ],
      },
    },
  });
  await flushPending();
  let disk = await readWorkspaceRecord<DebugDraftRecord>('debugDrafts', identityKey(identity));
  expect(disk?.session?.preRequestConfig?.steps[0]?.scriptCode).toBe('console.log(1)');
  expect(disk?.session?.postResponseConfig?.steps[0]?.scriptCode).toBe('console.log(2)');
  patchOperationDraft(identity, {
    session: {
      overrides: {},
      preRequestConfig: { steps: [] },
    },
  });
  await flushPending();
  disk = await readWorkspaceRecord<DebugDraftRecord>('debugDrafts', identityKey(identity));
  expect(disk?.session?.preRequestConfig).toEqual({ steps: [] });
  expect(disk?.session?.postResponseConfig).toBeUndefined();
});

it('releases inactive memory only after pending writes and supports rehydration', async () => {
  const { retainOperation, isOperationPrepared } =
    await import('../../../src/features/workspace/storage/repository');
  const identity = operationIdentity(scope('release-memory'), 'post', '/draft');
  const release = retainOperation(identity);
  await prepareOperation(identity);
  patchOperationDraft(identity, { bodies: { 'application/json': body('latest') } });
  release();
  expect(readOperationDraft(identity)?.bodies['application/json'].body).toBe('latest');
  await flushPending();
  expect(isOperationPrepared(identity)).toBe(false);
  expect(readOperationDraft(identity)).toBeUndefined();
  const releaseAgain = retainOperation(identity);
  await prepareOperation(identity);
  expect(readOperationDraft(identity)?.bodies['application/json'].body).toBe('latest');
  releaseAgain();
  releaseAgain();
  expect(isOperationPrepared(identity)).toBe(false);
});

it('preserves released drafts across a failed write until an explicit retry succeeds', async () => {
  const repository = await import('../../../src/features/workspace/storage/repository');
  const database = await import('../../../src/features/workspace/storage/database');
  const identity = operationIdentity(scope('release-failed'), 'post', '/draft');
  const release = repository.retainOperation(identity);
  await prepareOperation(identity);
  patchOperationDraft(identity, { bodies: { 'application/json': body('unsaved') } });
  const transaction = vi
    .spyOn(database, 'workspaceTransaction')
    .mockRejectedValueOnce(new Error('storage unavailable'));
  release();
  await expect(flushPending()).rejects.toThrow('storage unavailable');
  expect(readOperationDraft(identity)?.bodies['application/json'].body).toBe('unsaved');
  transaction.mockRestore();
  await repository.retryPersistence();
  expect(readOperationDraft(identity)).toBeUndefined();
  const retain = repository.retainOperation(identity);
  await prepareOperation(identity);
  expect(readOperationDraft(identity)?.bodies['application/json'].body).toBe('unsaved');
  retain();
});
