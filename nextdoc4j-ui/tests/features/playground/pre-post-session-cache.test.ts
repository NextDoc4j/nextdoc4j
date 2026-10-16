// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import {
  createDebugSessionKey,
  readDebugSession,
  writeDebugSession,
} from '../../../src/features/playground/session-cache';
import {
  operationIdentity,
  scopeToken,
  identityKey,
} from '../../../src/features/workspace/storage/identity';
import { prepareOperation, flushPending } from '../../../src/features/workspace/storage/repository';
import { readWorkspaceRecord } from '../../../src/features/workspace/storage/database';
import type { DebugDraftRecord } from '../../../src/features/workspace/storage/records';

it('omits empty session workflows and removes previously saved scripts from disk', async () => {
  const scope = { appId: 'empty-workflow', serviceKey: 'single-app' };
  const identity = operationIdentity(scope, 'post', '/auth');
  const key = createDebugSessionKey({
    requestPrefix: scopeToken(scope),
    method: 'post',
    path: '/auth',
  });
  await prepareOperation(identity);
  writeDebugSession(
    key,
    {
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
    },
    new Set(),
  );
  await flushPending();
  expect(sessionStorage.getItem(key)).not.toBeNull();
  writeDebugSession(
    key,
    {
      overrides: {},
      preRequestConfig: { steps: [] },
      postResponseConfig: { steps: [] },
    },
    new Set(),
  );
  await flushPending();
  expect(sessionStorage.getItem(key)).toBeNull();
  expect(readDebugSession(key, new Set()).preRequestConfig).toBeUndefined();
  const stored = await readWorkspaceRecord<DebugDraftRecord>('debugDrafts', identityKey(identity));
  expect(stored?.session?.preRequestConfig).toBeUndefined();
});
