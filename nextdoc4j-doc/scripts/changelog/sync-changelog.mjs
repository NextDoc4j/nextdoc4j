import { mkdirSync, readFileSync, watchFile, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const sourcePath = process.env.NEXTDOC4J_CHANGELOG_PATH
  ? resolve(process.env.NEXTDOC4J_CHANGELOG_PATH)
  : fileURLToPath(new URL('../../../CHANGELOG.md', import.meta.url));
const targetPath = fileURLToPath(new URL('../../content/docs/more/changelog.mdx', import.meta.url));
const frontmatter = `---
# 自动生成，请修改仓库根目录 CHANGELOG.md，再运行 pnpm changelog:sync。
title: 更新日志
description: NextDoc4j 的版本更新、兼容性说明和迁移记录。
---

`;
let watching = false;

export function syncChangelog() {
  let markdown;
  try {
    markdown = readFileSync(sourcePath, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  } catch (error) {
    throw new Error(`无法读取更新日志 ${sourcePath}。请保留仓库根目录 CHANGELOG.md，或通过 NEXTDOC4J_CHANGELOG_PATH 指定源文件。`, { cause: error });
  }
  if (!markdown) throw new Error(`更新日志 ${sourcePath} 为空，已保留上次生成的页面。`);

  const content = `${frontmatter}${markdown}\n`;
  let previous;
  try {
    previous = readFileSync(targetPath, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (previous === content) return;

  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, content, 'utf8');
  console.log('[changelog] 已同步更新日志');
}

export function watchChangelog() {
  if (watching) return;
  watching = true;
  // Poll the source path so editor saves using atomic replacement are detected too.
  // The watcher must not keep Next.js workers alive after their work is finished.
  watchFile(sourcePath, { interval: 500, persistent: false }, () => {
    try {
      syncChangelog();
    } catch (error) {
      console.error('[changelog]', error.message);
    }
  });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  syncChangelog();
}
