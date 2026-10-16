import path from 'node:path';
import {
  assertFile,
  assertHttp,
  demoJar,
  demoMonolithModule,
  demoMonolithRoot,
  rootPom,
  runMaven,
  runPnpm,
  startJava,
  stop,
  waitForHttp,
} from './common.mjs';

const port = Number(process.env.NEXTDOC4J_PREVIEW_PORT || 18000);
const baseUrl = `http://127.0.0.1:${port}`;
const skipUiBuild =
  process.argv.includes('--skip-ui-build') ||
  /^(1|true|yes)$/i.test(process.env.NEXTDOC4J_PREVIEW_SKIP_UI_BUILD || '');

if (!skipUiBuild) {
  await runPnpm(['run', 'check']);
  await runPnpm(['run', 'build:backend']);
}

await runMaven(
  [
    '-f',
    rootPom,
    '-pl',
    demoMonolithModule,
    '-am',
    'clean',
    'package',
    '-DskipTests',
  ],
);
await assertFile(demoJar, 'Spring Boot 3 demo jar');

const demo = startJava(['-jar', path.relative(demoMonolithRoot, demoJar), `--server.port=${port}`], {
  cwd: demoMonolithRoot,
});

try {
  const doc = await waitForHttp(`${baseUrl}/doc.html`);
  if (!doc.body.toLowerCase().includes('<html')) {
    throw new Error('doc.html did not return an HTML document');
  }

  const api = await assertHttp(`${baseUrl}/v3/api-docs`, 'OpenAPI document');
  if (!api.body.includes('openapi')) {
    throw new Error('OpenAPI document does not contain an openapi field');
  }

  const assetMatch = doc.body.match(/(?:src|href)="([^"]*nextdoc\/assets\/[^"?]+)/);
  if (!assetMatch) {
    throw new Error('doc.html does not contain a generated UI asset reference');
  }
  await assertHttp(new URL(assetMatch[1], `${baseUrl}/`).toString(), 'generated UI asset');

  console.log(`\nPreview test passed: ${baseUrl}/doc.html`);
} finally {
  await stop(demo);
}
