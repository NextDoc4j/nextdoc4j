import { describe, expect, it } from 'vitest';

import type { OpenApiDocument } from '../../../src/types/openapi';
import {
  findMarkdownDocument,
  groupMarkdownDocuments,
} from '../../../src/features/documentation/markdown';

const document: OpenApiDocument = {
  'x-nextdoc4j': {
    markdown: [
      { content: '# Z', displayName: '部署说明', group: '运维' },
      { content: '# A', displayName: '快速开始', group: '使用' },
      { content: '# B', displayName: '常见问题', group: '使用' },
    ],
  },
  info: { title: 'Markdown API', version: '1.0.0' },
  openapi: '3.0.3',
  paths: {},
};

describe('additional Markdown documents', () => {
  it('groups and orders documents deterministically for fixed-view navigation', () => {
    expect(groupMarkdownDocuments(document).map(([group]) => group)).toEqual(['使用', '运维']);
    expect(groupMarkdownDocuments(document)[0]?.[1].map((item) => item.displayName)).toEqual([
      '常见问题',
      '快速开始',
    ]);
  });

  it('finds only a document that matches both group and display name', () => {
    expect(findMarkdownDocument(document, '使用', '快速开始')?.content).toBe('# A');
    expect(findMarkdownDocument(document, '运维', '快速开始')).toBeUndefined();
  });
});
