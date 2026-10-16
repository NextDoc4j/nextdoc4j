import path from 'node:path';
import {
  assertHttp,
  demoJar,
  demoMonolithModule,
  demoMonolithRoot,
  rootPom,
  runMaven,
  startJava,
  startPnpm,
  stop,
  waitForHttp,
} from './common.mjs';

const configuredBackendUrl = process.env.NEXTDOC4J_DEV_BACKEND_URL?.replace(/\/+$/, '');
const backendPort = Number(
  process.env.NEXTDOC4J_DEV_BACKEND_PORT ||
    (configuredBackendUrl ? new URL(configuredBackendUrl).port || 8000 : 8000),
);
const uiPort = Number(process.env.NEXTDOC4J_DEV_UI_PORT || 5777);
const backendUrl = configuredBackendUrl || `http://127.0.0.1:${backendPort}`;
const uiUrl = `http://127.0.0.1:${uiPort}`;
const backendMode = process.env.NEXTDOC4J_DEV_BACKEND_MODE || 'auto';
const forceJar = process.argv.includes('--jar');
const requireExisting = process.argv.includes('--existing');

if (!['auto', 'jar', 'existing'].includes(backendMode)) {
  throw new Error('NEXTDOC4J_DEV_BACKEND_MODE must be auto, jar, or existing');
}
if (forceJar && requireExisting) {
  throw new Error('--jar and --existing cannot be used together');
}

const shouldUseExisting = requireExisting || (!forceJar && backendMode === 'existing');
const shouldTryExisting = requireExisting || (!forceJar && backendMode !== 'jar');
let backend;
let usingExistingBackend = false;

if (shouldTryExisting) {
  try {
    const existing = await waitForHttp(`${backendUrl}/v3/api-docs`, {
      timeoutMs: 3000,
      intervalMs: 250,
      isReady: (response) => response.status >= 200 && response.status < 300,
    });
    usingExistingBackend = existing.status >= 200 && existing.status < 300;
  } catch {
    if (shouldUseExisting) {
      throw new Error(`No running Demo service was found at ${backendUrl}`);
    }
  }
}

if (!usingExistingBackend) {
  await runMaven(
    [
      '-f',
      rootPom,
      '-pl',
      demoMonolithModule,
      '-am',
      'package',
      '-DskipTests',
    ],
  );

  backend = startJava(
    ['-jar', path.relative(demoMonolithRoot, demoJar), `--server.port=${backendPort}`],
    {
      cwd: demoMonolithRoot,
    },
  );
}
const ui = startPnpm(['run', 'dev', '--host', '0.0.0.0', '--port', String(uiPort)], {
  env: {
    VITE_DOC_PROXY_MODE: 'single',
    VITE_GLOB_API_URL: '/api',
    VITE_API_PROXY_TARGET: backendUrl,
  },
});

const cleanup = async () => {
  await Promise.all([stop(ui), stop(backend)]);
};

process.once('SIGINT', async () => {
  await cleanup();
  process.exit(0);
});
process.once('SIGTERM', async () => {
  await cleanup();
  process.exit(0);
});

try {
  await waitForHttp(`${backendUrl}/v3/api-docs`, {
    isReady: (response) => response.status >= 200 && response.status < 300,
  });
  await waitForHttp(uiUrl, {
    isReady: (response) => response.status >= 200 && response.status < 300,
  });
  await assertHttp(uiUrl, 'frontend development server');
  await assertHttp(`${uiUrl}/api/v3/api-docs`, 'frontend API proxy');

  console.log(`\nDevelopment test is ready:`);
  console.log(`  frontend: ${uiUrl}`);
  console.log(`  backend:  ${backendUrl}/doc.html`);
  console.log(`  source:   ${usingExistingBackend ? 'existing IDEA service' : 'release script'}`);
  console.log('Press Ctrl+C to stop both processes.');

  await new Promise(() => {});
} finally {
  await cleanup();
}
