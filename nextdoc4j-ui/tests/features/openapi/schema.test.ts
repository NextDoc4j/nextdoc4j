import { describe, expect, it } from 'vitest';

import { formatSchemaValue, getSchemaEnumItems } from '../../../src/features/openapi/schema';

describe('schema presentation metadata', () => {
  it('prefers the Nextdoc4j enum extension because it preserves descriptions', () => {
    expect(
      getSchemaEnumItems({
        enum: ['ENABLED', 'DISABLED'],
        'x-nextdoc4j-enum': {
          items: [
            { description: '启用', value: 'ENABLED' },
            { description: '禁用', value: 'DISABLED' },
          ],
        },
      }),
    ).toEqual([
      { description: '启用', value: 'ENABLED' },
      { description: '禁用', value: 'DISABLED' },
    ]);
  });

  it('normalizes standard enum values and complex default values', () => {
    expect(getSchemaEnumItems({ enum: [1, 'two'] })).toEqual([{ value: 1 }, { value: 'two' }]);
    expect(formatSchemaValue({ page: 1 })).toBe('{"page":1}');
  });
});
