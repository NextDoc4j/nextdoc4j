// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { RequestParameters } from '../../src/features/documentation/request-parameters';
import { ResponseParameters } from '../../src/features/documentation/response-parameters';
import { createJsonExample } from '../../src/features/documentation/json-example-model';
import type { ApiOperation, Schema } from '../../src/types/openapi';

const schemas: Record<string, Schema> = {
  MenuTreeNode: {
    type: 'object',
    description: '菜单树节点',
    properties: {
      id: { type: 'integer' },
      children: {
        type: 'array',
        description: '菜单树节点',
        items: { $ref: '#/components/schemas/MenuTreeNode' },
      },
    },
  },
};
const schema = { $ref: '#/components/schemas/MenuTreeNode' };
const operation: ApiOperation = {
  method: 'post',
  path: '/tree',
  group: 'tree',
  requestBody: { content: { 'application/json': { schema } } },
  responses: { '200': { description: 'OK', content: { 'application/json': { schema } } } },
};
afterEach(() => vi.unstubAllGlobals());
it('omits undeclared request parameters while retaining an explicitly declared empty body', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  try {
    const render = (operation: ApiOperation) => (
      <RequestParameters
        operation={operation}
        schemas={{}}
        contentType="application/json"
        onContentTypeChange={() => undefined}
      />
    );
    await act(async () => root.render(render({ method: 'get', path: '/empty', group: 'test' })));
    expect(host.textContent).toBe('');
    await act(async () =>
      root.render(
        render({
          method: 'post',
          path: '/empty',
          group: 'test',
          requestBody: {
            content: { 'application/json': { schema: { type: 'object', properties: {} } } },
          },
        }),
      ),
    );
    expect(host.querySelector('.operation-request')).not.toBeNull();
    expect(host.textContent).toContain('请求参数');
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});
it.each(['request', 'response'] as const)(
  'renders one recursive child in the %s tree with an inline label and working disclosure',
  async (direction) => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    try {
      await act(async () =>
        root.render(
          direction === 'request' ? (
            <RequestParameters
              operation={operation}
              schemas={schemas}
              contentType="application/json"
              onContentTypeChange={() => undefined}
            />
          ) : (
            <ResponseParameters operation={operation} components={{ schemas }} />
          ),
        ),
      );
      const recursive = host.querySelector<HTMLElement>('[data-path="body.children"]')!;
      expect(recursive).not.toBeNull();
      const head = recursive.querySelector('.operation-request__field-head')!;
      expect(head.textContent).toContain('array<MenuTreeNode>');
      expect(head.textContent).toContain('可选');
      expect(head.textContent).toContain('菜单树节点');
      expect(head.textContent).toContain('递归节点');
      expect(head.textContent).toContain('body.children[]');
      expect(host.querySelectorAll('.operation-request__recursive-label')).toHaveLength(1);
      expect(host.textContent).not.toContain('继续展开一层');
      expect(host.querySelector('[data-path="body.children[].id"]')).not.toBeNull();
      const terminal = host.querySelector('[data-path="body.children[].children"]')!;
      expect(terminal).not.toBeNull();
      expect(terminal.querySelector('.operation-request__disclosure')).toBeNull();
      expect(host.querySelector('[data-path="body.children[].children[].id"]')).toBeNull();
      const toggle = recursive.querySelector<HTMLButtonElement>('.operation-request__disclosure')!;
      await act(async () => toggle.click());
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(host.querySelector('[data-path="body.children[].id"]')).toBeNull();
      await act(async () => toggle.click());
      expect(host.querySelector('[data-path="body.children[].id"]')).not.toBeNull();
      expect(
        createJsonExample(schema, 'body', { schemas, variants: new Map(), direction }),
      ).toEqual({ id: 0, children: [{ id: 0, children: [] }] });
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  },
);
it('preserves ordinary nested entities and stops object and mutual recursion after one repeated entity', () => {
  const context = {
    schemas: {
      A: { type: 'object', properties: { b: { $ref: '#/components/schemas/B' } } },
      B: { type: 'object', properties: { a: { $ref: '#/components/schemas/A' } } },
      Node: { type: 'object', properties: { parent: { $ref: '#/components/schemas/Node' } } },
      Wrapper: { type: 'object', properties: { node: schema } },
      ...schemas,
    } as Record<string, Schema>,
    variants: new Map<string, number>(),
    direction: 'response' as const,
  };
  expect(createJsonExample({ $ref: '#/components/schemas/A' }, 'body', context)).toEqual({
    b: { a: { b: {} } },
  });
  expect(createJsonExample({ $ref: '#/components/schemas/Node' }, 'body', context)).toEqual({
    parent: { parent: {} },
  });
  expect(createJsonExample({ $ref: '#/components/schemas/Wrapper' }, 'body', context)).toEqual({
    node: { id: 0, children: [{ id: 0, children: [] }] },
  });
});

it('does not count an array item wrapper as another recursive entity', async () => {
  const { createRequestField } = await import('../../src/features/documentation/request-schema');
  const compositeSchemas: Record<string, Schema> = {
    MenuTreeNode: {
      allOf: [
        {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            children: { type: 'array', items: { $ref: '#/components/schemas/MenuTreeNode' } },
          },
        },
      ],
    },
  };
  const field = createRequestField(
    'children',
    { type: 'array', items: schema },
    'body.children',
    false,
    {
      ancestors: new Set(['#/components/schemas/MenuTreeNode']),
      schemas: compositeSchemas,
      variants: new Map(),
    },
  );
  expect(field.recursive).toBe(true);
  const item = field.children[0];
  expect(item.cycle).toBeUndefined();
  expect(item.children.map((child) => child.name)).toEqual(['id', 'children']);
  expect(item.children[1].children).toEqual([]);
});
