import { describe, expect, it } from 'vitest';
import {
  getDefaultRequestTab,
  resolvePlaygroundOperation,
} from '../../../src/features/playground/request-defaults';
import { getDefaultContentType } from '../../../src/features/openapi/utils';
import { resolveBodyKind } from '../../../src/features/playground/request';
import type { ApiOperation, OpenApiDocument } from '../../../src/types/openapi';
const operation: ApiOperation = { method: 'post', path: '/users', group: 'users' };

describe('initial debugger input selection', () => {
  it.each([
    ['application/json', 'json'],
    ['application/problem+json', 'json'],
    ['application/xml', 'xml'],
    ['multipart/form-data', 'form-data'],
    ['application/x-www-form-urlencoded', 'urlencoded'],
    ['application/octet-stream', 'binary'],
  ])('opens body with its declared editor for %s', (media, editor) => {
    const input = { ...operation, requestBody: { content: { [media]: {} } } };
    expect(getDefaultRequestTab(input)).toBe('body');
    expect(resolveBodyKind(getDefaultContentType(input.requestBody.content))).toBe(editor);
  });
  it('prioritizes path and query inputs when mixed with a body', () => {
    expect(
      getDefaultRequestTab({
        ...operation,
        requestBody: { content: { 'application/json': {} } },
        parameters: [{ in: 'query', name: 'page' }],
      }),
    ).toBe('params');
    expect(
      getDefaultRequestTab(resolvePlaygroundOperation({ ...operation, path: '/users/{id}' }, {})),
    ).toBe('params');
  });
  it('resolves reusable bodies and shared parameters before choosing an editor', () => {
    const document: OpenApiDocument = {
      paths: { '/users': { parameters: [{ in: 'query', name: 'search' }] } },
      components: { requestBodies: { Create: { content: { 'application/json': {} } } } },
    };
    const input = { ...operation, requestBody: { $ref: '#/components/requestBodies/Create' } };
    expect(getDefaultRequestTab(resolvePlaygroundOperation(input, document))).toBe('params');
    expect(
      getDefaultRequestTab(resolvePlaygroundOperation(input, { ...document, paths: {} })),
    ).toBe('body');
  });
  it('uses headers or cookies when those are the only inputs and params when there are none', () => {
    expect(
      getDefaultRequestTab({ ...operation, parameters: [{ in: 'header', name: 'X-Test' }] }),
    ).toBe('headers');
    expect(
      getDefaultRequestTab({ ...operation, parameters: [{ in: 'cookie', name: 'session' }] }),
    ).toBe('cookies');
    expect(getDefaultRequestTab(operation)).toBe('params');
  });
});
