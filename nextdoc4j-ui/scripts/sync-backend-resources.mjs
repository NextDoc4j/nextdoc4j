import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const uiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(uiRoot, '..');
const distRoot = path.join(uiRoot, 'dist');
const backendResources = path.join(
  repoRoot,
  'nextdoc4j',
  'nextdoc4j-ui',
  'src',
  'main',
  'resources',
);
const staticRoot = path.join(backendResources, 'nextdoc');

await rm(staticRoot, { recursive: true, force: true });
await mkdir(staticRoot, { recursive: true });

for (const directory of ['assets', 'fonts', 'licenses']) {
  await cp(path.join(distRoot, directory), path.join(staticRoot, directory), { recursive: true });
}

const html = await readFile(path.join(distRoot, 'index.html'), 'utf8');
await writeFile(
  path.join(backendResources, 'doc.html'),
  html.replaceAll('./assets/', './nextdoc/assets/'),
  'utf8',
);

console.log(`Synced UI build to ${path.relative(repoRoot, backendResources)}`);
