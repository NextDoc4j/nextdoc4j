import { describe, expect, it } from 'vitest';

import { getSecurityMetadataDisplay } from '../../../src/features/security/metadata';
import type { Operation } from '../../../src/types/openapi';

describe('Sa-Token security metadata', () => {
  it('formats permission, alternative role and role annotations for display', () => {
    const operation: Operation = {
      'x-nextdoc4j-security': {
        permissions: [
          {
            mode: 'OR',
            orType: 'role',
            orValues: ['admin'],
            values: ['user:add', 'user:delete'],
          },
        ],
        roles: [{ mode: 'AND', values: ['auditor', 'operator'] }],
      },
    };

    expect(getSecurityMetadataDisplay(operation)).toEqual({
      ignored: false,
      rules: [
        {
          connector: '或',
          kind: 'permission',
          label: '权限',
          values: ['user:add', 'user:delete'],
        },
        {
          connector: '或',
          kind: 'role',
          label: '备选角色',
          values: ['admin'],
        },
        {
          connector: '且',
          kind: 'role',
          label: '角色',
          values: ['auditor', 'operator'],
        },
      ],
    });
  });

  it('marks SaIgnore as a public endpoint and hides malformed empty metadata', () => {
    expect(
      getSecurityMetadataDisplay({
        'x-nextdoc4j-security': { ignore: true, permissions: [{ values: ['unused'] }] },
      }),
    ).toEqual({ ignored: true, rules: [] });
    expect(
      getSecurityMetadataDisplay({
        'x-nextdoc4j-security': { permissions: [{ values: [' ', 1 as unknown as string] }] },
      }),
    ).toBeUndefined();
  });
});
