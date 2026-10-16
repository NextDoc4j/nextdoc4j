import { expect, it, vi } from 'vitest';
import {
  createWorkflowRuntime,
  executePreRequestPipeline,
} from '../../../src/features/playground/pre-post-engine';
import {
  createWorkflowStep,
  type WorkflowTransform,
} from '../../../src/features/playground/pre-post-types';

/** Executes a conversion through the real pipeline with a typed source variable.
 * @param algorithm Conversion selected by the user.
 * @param value Original value, including objects and primitives.
 * @returns Final request and runtime after conversion and JSON-field assignment.
 */
async function convert(algorithm: WorkflowTransform | undefined, value: unknown) {
  const runtime = createWorkflowRuntime({ input: value });
  return executePreRequestPipeline(
    {
      steps: [
        {
          ...createWorkflowStep('transform', 'pre-request'),
          source: 'flow',
          path: 'input',
          algorithm,
          writeBack: false,
          saveAs: 'converted',
        },
        {
          ...createWorkflowStep('write', 'pre-request'),
          source: 'variable',
          path: 'converted',
          targetType: 'body',
          targetField: '$.value',
        },
      ],
    },
    {
      body: '{}',
      bodyKind: 'json',
      headers: [],
      queryParams: [],
      runtime,
      onLog: vi.fn(),
      setBody: vi.fn(),
      setHeaders: vi.fn(),
      setQueryParams: vi.fn(),
    },
  );
}

it.each<[WorkflowTransform | undefined, unknown, unknown]>([
  ['trim', '  hello\n', 'hello'],
  ['uppercase', 'ab中文', 'AB中文'],
  ['lowercase', 'AB中文', 'ab中文'],
  ['json-parse', '{"items":[1,false]}', { items: [1, false] }],
  ['json-parse', 'null', null],
  ['json-stringify', { a: 1 }, '{"a":1}'],
  ['json-stringify', 'text', '"text"'],
  ['to-string', { a: 1 }, '{"a":1}'],
  ['to-string', false, 'false'],
  ['to-number', ' 12.5 ', 12.5],
  ['to-number', '0', 0],
  ['to-number', '1e3', 1000],
  ['to-boolean', 'false', false],
  ['to-boolean', ' true ', true],
  ['to-boolean', false, false],
  ['url-encode', 'a+b &中', 'a%2Bb%20%26%E4%B8%AD'],
  ['url-decode', 'a%2Bb%20%26%E4%B8%AD', 'a+b &中'],
  ['base64-decode', '5Lit5paH8J+YgA==', '中文😀'],
  ['base64', '中文😀', '5Lit5paH8J+YgA=='],
  [undefined, 'old', 'b2xk'],
])(
  'converts %s while preserving the result type in the final JSON body',
  async (algorithm, value, expected) => {
    const result = await convert(algorithm, value);
    expect(result.runtime.variables.converted).toEqual(expected);
    expect(JSON.parse(result.body).value).toEqual(expected);
  },
);

it.each<[WorkflowTransform, unknown]>([
  ['trim', { text: 'hello' }],
  ['uppercase', 123],
  ['json-parse', '{invalid}'],
  ['json-parse', { a: 1 }],
  ['to-number', ''],
  ['to-number', '  '],
  ['to-number', true],
  ['to-number', null],
  ['to-number', 'Infinity'],
  ['to-number', '1e999'],
  ['to-number', '9007199254740993'],
  ['to-number', '1e20'],
  ['to-boolean', '0'],
  ['to-boolean', 'hello'],
  ['to-boolean', []],
  ['url-decode', '%GG'],
  ['base64-decode', '!!'],
  ['base64-decode', '/w=='],
])('rejects invalid %s input instead of silently coercing it', async (algorithm, value) => {
  await expect(convert(algorithm, value)).rejects.toThrow();
});

it('retains the request field and clears a stale saved result when a conversion fails and continues', async () => {
  const runtime = createWorkflowRuntime({ result: 'stale' });
  const result = await executePreRequestPipeline(
    {
      steps: [
        {
          ...createWorkflowStep('transform', 'pre-request'),
          source: 'request',
          sourcePart: 'body',
          path: '$.value',
          algorithm: 'to-number',
          writeBack: true,
          failurePolicy: 'continue',
          saveAs: 'result',
          scope: 'flow',
        },
      ],
    },
    {
      body: '{"value":"invalid"}',
      headers: [],
      queryParams: [],
      runtime,
      onLog: vi.fn(),
      setBody: vi.fn(),
      setHeaders: vi.fn(),
      setQueryParams: vi.fn(),
    },
  );
  expect(result.body).toBe('{"value":"invalid"}');
  expect(runtime.flow.result).toBeUndefined();
});
