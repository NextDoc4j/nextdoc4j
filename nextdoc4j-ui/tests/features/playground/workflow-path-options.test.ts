import { expect, it } from 'vitest';
import { getWorkflowPathOptions } from '../../../src/features/playground/workflow-path-options';

it('offers referenced nested fields, arrays and fields from actual JSON', () => {
  const options = getWorkflowPathOptions(
    { properties: { data: { $ref: '#/components/schemas/Result' } } },
    {
      Result: {
        properties: {
          tokens: {
            type: 'array',
            items: { properties: { value: { type: 'string', description: '令牌' } } },
          },
        },
      },
    },
    { extra: true },
  );
  expect(options).toContainEqual({
    value: '$.data.tokens[0].value',
    label: '$.data.tokens[0].value · 令牌',
  });
  expect(options).toContainEqual({ value: '$.extra', label: '$.extra' });
});

it('bounds recursive schemas and omits unsupported literal dotted field names', () => {
  const schema = { properties: { child: { $ref: '#/components/schemas/Node' } } };
  const options = getWorkflowPathOptions(schema, { Node: schema }, { 'literal.dot': 1 });
  expect(options.length).toBeLessThanOrEqual(9);
  expect(options.some((option) => option.value.includes('literal.dot'))).toBe(false);
});
