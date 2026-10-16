import { describe, expect, it } from 'vitest';
import { searchEntries, type SearchSource } from '../../../src/features/workspace/search-index';
import {
  getSearchMatchSummary,
  scoreSearchEntry,
} from '../../../src/features/workspace/search-ranking';
import { parseHashRoute } from '../../../src/lib/hash-route';

const sources: SearchSource[] = [
  {
    id: 'all',
    name: '全部接口',
    document: {
      paths: {
        '/roles': { get: { summary: '角色列表' } },
        '/hidden': { get: { summary: 'Other', description: '隐藏接口描述' } },
      },
      components: {
        schemas: {
          UpdateMenusReq: {
            type: 'object',
            description: '角色菜单更新参数',
            properties: { secret: { type: 'string', description: '不参与搜索的属性说明' } },
          },
          EnglishTitle: { title: 'English title', description: '角色配置' },
          Plain: { type: 'object' },
        },
      },
    },
  },
];

describe('global model search', () => {
  it.each(['', '/services/roles/v3/api-docs'])(
    'matches model descriptions and preserves identity in scope %s',
    (serviceUrl) => {
      const entries = [...searchEntries(sources, '角色服务', serviceUrl)];
      const matches = entries.filter((entry) => scoreSearchEntry(entry, ['角色']) >= 0);
      expect(matches.map((entry) => entry.path)).toEqual([
        '/roles',
        'UpdateMenusReq',
        'EnglishTitle',
      ]);
      const model = matches.find((entry) => entry.path === 'UpdateMenusReq')!;
      expect(model.description).toBe('角色菜单更新参数');
      expect(model.serviceUrl).toBe(serviceUrl);
      expect(parseHashRoute(model.route)).toMatchObject({
        view: 'models',
        modelName: 'UpdateMenusReq',
      });
      expect(scoreSearchEntry(model, ['updatemenusreq'])).toBeGreaterThan(
        scoreSearchEntry(model, ['角色']),
      );
      expect(scoreSearchEntry(model, ['角色', '菜单'])).toBeGreaterThanOrEqual(0);
      expect(scoreSearchEntry(model, ['角色', 'missing'])).toBe(-1);
      expect(scoreSearchEntry(model, ['不参与搜索的属性说明'])).toBe(-1);
      expect(
        entries
          .filter((entry) => scoreSearchEntry(entry, ['隐藏接口描述']) >= 0)
          .map((entry) => entry.path),
      ).toEqual(['/hidden']);
    },
  );
  it('keeps same-name models isolated between services and preserves group routes', () => {
    const grouped = [{ ...sources[0], id: 'admin', name: '管理接口' }];
    const first = [...searchEntries(grouped, '服务一', '/one/docs')].find(
      (entry) => entry.kind === 'model',
    )!;
    const second = [...searchEntries(grouped, '服务二', '/two/docs')].find(
      (entry) => entry.kind === 'model',
    )!;
    expect(first.id).not.toBe(second.id);
    expect(parseHashRoute(first.route)).toMatchObject({
      view: 'models',
      modelName: 'UpdateMenusReq',
      sourceGroupId: 'admin',
    });
    expect(scoreSearchEntry(first, ['角色'])).toBeGreaterThanOrEqual(0);
    expect(scoreSearchEntry(second, ['角色'])).toBeGreaterThanOrEqual(0);
  });
});

it.each(['', '/service/docs'])(
  'matches API metadata across fields without indexing parameter contents: %s',
  (serviceUrl) => {
    const entry = [
      ...searchEntries(
        [
          {
            id: 'all',
            name: '默认组',
            document: {
              paths: {
                '/members': {
                  post: {
                    summary: '创建成员',
                    operationId: 'grantRoleAccess',
                    description: '授予角色权限并同步菜单',
                    tags: ['权限管理'],
                    parameters: [
                      { name: 'internalToken', in: 'query', description: '内部参数不可检索' },
                    ],
                  },
                },
              },
            },
          },
        ],
        'Service',
        serviceUrl,
      ),
    ][0];
    for (const words of [['角色'], ['grantroleaccess'], ['权限管理'], ['创建', '角色', '权限管理']])
      expect(scoreSearchEntry(entry, words)).toBeGreaterThanOrEqual(0);
    expect(scoreSearchEntry(entry, ['internaltoken'])).toBe(-1);
    expect(scoreSearchEntry(entry, ['角色', 'missing'])).toBe(-1);
    expect(scoreSearchEntry(entry, ['创建成员'])).toBeGreaterThan(
      scoreSearchEntry(entry, ['角色']),
    );
    expect(getSearchMatchSummary(entry, '角色')).toMatchObject({
      label: '接口说明',
      text: '授予角色权限并同步菜单',
    });
    expect(getSearchMatchSummary(entry, 'grantroleaccess')).toMatchObject({
      label: '接口标识',
      text: 'grantRoleAccess',
    });
    expect(getSearchMatchSummary(entry, '权限管理')).toMatchObject({
      label: '接口标签',
      text: '权限管理',
    });
  },
);
it('matches additional document group and full body, returning a bounded excerpt around a late match', () => {
  const entry = {
    id: 'doc',
    kind: 'document' as const,
    title: '接入指南',
    path: '接入指南',
    group: '运维手册',
    method: 'DOC',
    service: 'Demo',
    serviceUrl: '',
    route: '#/markdown/运维手册/接入指南',
    text: '接入指南',
    content:
      '开篇说明。'.repeat(1000) +
      '角色授权失败处理步骤：重新配置凭据。' +
      '后续内容。'.repeat(1000),
  };
  expect(scoreSearchEntry(entry, ['角色', '运维'])).toBeGreaterThanOrEqual(0);
  expect(scoreSearchEntry(entry, ['角色', '不存在'])).toBe(-1);
  const summary = getSearchMatchSummary(entry, '角色')!;
  expect(summary.label).toBe('正文');
  expect(summary.text).toContain('角色授权失败处理步骤');
  expect(summary.text.length).toBeLessThanOrEqual(162);
  expect(getSearchMatchSummary(entry, '运维')).toEqual({ label: '文档分组', text: '运维手册' });
  expect(scoreSearchEntry(entry, ['接入指南'])).toBeGreaterThan(scoreSearchEntry(entry, ['角色']));
});
it('retains standalone HTTP-method behavior when searching supplemental text', () => {
  const model = [
    ...searchEntries(
      [
        {
          ...sources[0],
          document: { components: { schemas: { Target: { description: 'target name' } } } },
        },
      ],
      '',
      '',
    ),
  ][0];
  expect(scoreSearchEntry(model, ['get'])).toBe(-1);
  const api = [
    ...searchEntries(
      [
        {
          id: 'all',
          name: '',
          document: {
            paths: { '/lookup': { get: { summary: 'Read', description: '支持 get 查询' } } },
          },
        },
      ],
      '',
      '',
    ),
  ][0];
  expect(scoreSearchEntry(api, ['get'])).toBeGreaterThanOrEqual(0);
});
