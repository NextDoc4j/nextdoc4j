import { llms, loader } from 'fumadocs-core/source';
import type { Folder, Item, Node, Root } from 'fumadocs-core/page-tree';
import { docsContentRoute, docsImageRoute, docsRoute } from './shared';
import { defineDocs } from 'fumadocs-mdx/macro';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';

const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: pageSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

function normalizeUrl(url: string) {
  return url.length > 1 ? url.replace(/\/$/, '') : url;
}

function findFolder(node: Root | Folder, path: string): Folder | undefined {
  for (const child of node.children) {
    if (child.type !== 'folder') continue;
    const folderPath = child.$ref?.folder;
    if (folderPath === path || folderPath?.endsWith(`/${path}`)) return child;

    const nested = findFolder(child, path);
    if (nested) return nested;
  }

  return undefined;
}

function findPage(node: Root | Folder, url: string): Item | undefined {
  const target = normalizeUrl(url);

  for (const child of node.children) {
    if (child.type === 'page' && normalizeUrl(child.url) === target) return child;
    if (child.type === 'folder') {
      if (child.index && normalizeUrl(child.index.url) === target) return child.index;
      const nested = findPage(child, url);
      if (nested) return nested;
    }
  }

  return undefined;
}

function renamePage(page: Item | undefined, name: string) {
  return page ? { ...page, name } : undefined;
}

function expandedFolder(id: string, name: string, children: Node[]): Folder {
  return {
    $id: id,
    type: 'folder',
    name,
    defaultOpen: true,
    collapsible: false,
    children,
  };
}

function regroupDocs(root: Root): Root {
  const start = findFolder(root, 'guide/start');
  const config = findFolder(root, 'guide/config');
  const ui = findFolder(root, 'guide/ui');
  const plugin = findFolder(root, 'guide/plugin');
  const more = findFolder(root, 'more');

  const introduction = renamePage(findPage(root, '/guide'), '简介');
  const quickStart = findPage(start ?? root, '/guide/start/started');
  const developmentGuide = renamePage(findPage(root, '/development'), '开发指南');

  const startPages = [introduction, quickStart, developmentGuide].filter(
    (page): page is Item => Boolean(page),
  );

  return {
    ...root,
    children: [
      expandedFolder('nd-group-start', '开始', startPages),
      expandedFolder('nd-group-config', '配置说明', config?.children ?? []),
      expandedFolder('nd-group-ui', '界面功能', ui?.children ?? []),
      expandedFolder('nd-group-plugin', '插件说明', plugin?.children ?? []),
      expandedFolder('nd-group-more', '更多', more?.children ?? []),
    ],
  };
}

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
  pageTree: {
    transformers: [{ root: regroupDocs }],
  },
  plugins: [],
});

export const docsLlms = llms(source, {
  renderPage: async (page) => `# ${page.data.title} (${page.url})

${await page.data.getText('processed')}`,
});
