import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  assertDirectory,
  assertFile,
  backendResources,
  runPnpm,
} from './common.mjs';

const staticRoot = path.join(backendResources, 'nextdoc');
const docHtml = path.join(backendResources, 'doc.html');

await runPnpm(['run', 'build:backend']);
await assertFile(docHtml, 'backend doc.html');
await assertDirectory(path.join(staticRoot, 'assets'), 'backend UI assets');

const html = await readFile(docHtml, 'utf8');
if (!html.includes('./nextdoc/assets/')) {
  throw new Error('backend doc.html does not point to ./nextdoc/assets/');
}

console.log(`\nUI build is ready in ${path.relative(process.cwd(), backendResources)}`);
