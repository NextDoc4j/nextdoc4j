import net from 'node:net';
import path from 'node:path';
import {
  assertDirectory,
  assertFile,
  assertHttp,
  backendResources,
  repoRoot,
  rootPom,
  run,
  runMaven,
  startJava,
  stop,
  waitForHttp,
} from '../common.mjs';
import {
  defaultProfile,
  moduleJar,
  moduleRoot,
  profileServices,
  resolveProfile,
} from './demo-profiles.mjs';

function optionValue(name) {
  const equals = process.argv.find((value) => value.startsWith(`${name}=`));
  if (equals) return equals.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function asBoolean(value, name, fallback) {
  if (value === undefined) return fallback;
  if (/^(true|1)$/i.test(value)) return true;
  if (/^(false|0)$/i.test(value)) return false;
  throw new Error(`${name} must be true or false`);
}

function canConnect(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    const finish = (value) => {
      socket.destroy();
      resolve(value);
    };
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.setTimeout(250, () => finish(false));
  });
}

async function assertPortsAvailable(ports) {
  const occupied = [];
  for (const port of [...new Set(ports)]) {
    if (await canConnect(port)) occupied.push(port);
  }
  if (occupied.length > 0) {
    throw new Error(`Preview profile ports are already in use: ${occupied.join(', ')}`);
  }
}

function moduleStart(module, port, nacosPortOffset) {
  const root = moduleRoot(module);
  const javaOptions = nacosPortOffset ? [`-Dnacos.server.grpc.port.offset=${nacosPortOffset}`] : [];
  return {
    args: [...javaOptions, '-jar', path.relative(root, moduleJar(module)), `--server.port=${port}`],
    cwd: root,
  };
}

function readBuildUiOption() {
  if (process.argv.includes('--no-build-ui') || process.argv.includes('--skip-ui-build')) {
    throw new Error('Use --build-ui=true or --build-ui=false');
  }
  const option = optionValue('--build-ui');
  return asBoolean(option ?? process.env.NEXTDOC4J_PREVIEW_BUILD_UI, '--build-ui', true);
}

const profileName =
  optionValue('--profile') || process.env.NEXTDOC4J_DEMO_PROFILE || defaultProfile;
const profile = resolveProfile(profileName);
const configuredServices =
  optionValue('--services') || process.env.NEXTDOC4J_DEMO_GATEWAY_SERVICES;
const selectedServices = profileServices(profile, configuredServices);
const buildUi = readBuildUiOption();
const keepAlive = asBoolean(
  optionValue('--keep-alive') ?? process.env.NEXTDOC4J_PREVIEW_KEEP_ALIVE,
  '--keep-alive',
  true,
);
const configuredPreviewPort = process.env.NEXTDOC4J_DEMO_PREVIEW_PORT;
const previewPort = Number(configuredPreviewPort || profile.previewPort);
if (!Number.isInteger(previewPort) || previewPort < 1 || previewPort > 65535) {
  throw new Error(`Invalid preview port: ${previewPort}`);
}
const nacosGrpcPortOffset =
  profile.stack === 'gateway'
    ? process.env.NEXTDOC4J_DEV_NACOS_GRPC_PORT_OFFSET?.trim()
    : undefined;
if (
  nacosGrpcPortOffset &&
  (!/^\d+$/.test(nacosGrpcPortOffset) || Number(nacosGrpcPortOffset) > 65535)
) {
  throw new Error('Nacos gRPC port offset must be an integer from 0 to 65535');
}

const staticRoot = path.join(backendResources, 'nextdoc');
if (buildUi) {
  await run(process.execPath, [path.join(repoRoot, 'release', 'buildui', 'build-ui.mjs')]);
} else {
  await assertFile(path.join(backendResources, 'doc.html'), 'existing backend doc.html');
  await assertDirectory(path.join(staticRoot, 'assets'), 'existing backend UI assets');
}

const modules = [profile.module, ...selectedServices.map((service) => service.module)];
const backendPorts = [previewPort, ...selectedServices.map((service) => service.port)];
await assertPortsAvailable(backendPorts);
await runMaven(['-f', rootPom, '-pl', modules.join(','), '-am', 'clean', 'package', '-DskipTests']);

const backendProcesses = [];
for (const service of selectedServices) {
  const start = moduleStart(service.module, service.port, nacosGrpcPortOffset);
  backendProcesses.push(startJava(start.args, { cwd: start.cwd }));
}
const primaryStart = moduleStart(profile.module, previewPort, nacosGrpcPortOffset);
backendProcesses.push(startJava(primaryStart.args, { cwd: primaryStart.cwd }));

const baseUrl = `http://127.0.0.1:${previewPort}`;
let cleanupPromise;
const cleanup = async () => {
  if (!cleanupPromise) {
    cleanupPromise = Promise.all(backendProcesses.map((child) => stop(child)));
  }
  await cleanupPromise;
};
const stopAndExit = async (exitCode) => {
  await cleanup();
  process.exit(exitCode);
};
process.once('SIGINT', () => void stopAndExit(130));
process.once('SIGTERM', () => void stopAndExit(143));

try {
  if (profile.stack === 'gateway') {
    await Promise.all(
      selectedServices.map((service) =>
        waitForHttp(`http://127.0.0.1:${service.port}${service.readinessPath}`, {
          isReady: (response) => response.status >= 200 && response.status < 300,
        }),
      ),
    );
  }

  const doc = await waitForHttp(`${baseUrl}/doc.html`);
  if (!doc.body.toLowerCase().includes('<html')) {
    throw new Error(`${profile.id} doc.html did not return an HTML document`);
  }

  const api = await assertHttp(`${baseUrl}/v3/api-docs`, 'OpenAPI document');
  if (!api.body.includes('openapi')) {
    throw new Error(`${profile.id} OpenAPI document does not contain an openapi field`);
  }
  if (profile.stack === 'gateway' && !api.body.includes('"x-nextdoc4j-aggregation"')) {
    throw new Error(`${profile.id} OpenAPI document does not contain gateway aggregation metadata`);
  }

  const assetMatch = doc.body.match(/(?:src|href)="([^"]*nextdoc\/assets\/[^"?]+)/);
  if (!assetMatch) {
    throw new Error(`${profile.id} doc.html does not contain a generated UI asset reference`);
  }
  await assertHttp(new URL(assetMatch[1], `${baseUrl}/`).toString(), 'generated UI asset');

  console.log(`\nPreview test passed: ${profile.id}`);
  console.log(`  url:      ${baseUrl}/doc.html`);
  console.log(`  ui build: ${buildUi ? 'performed' : 'reused existing resources'}`);
  if (profile.stack === 'gateway') {
    console.log(
      `  services: ${selectedServices.length > 0 ? selectedServices.map(({ name }) => name).join(', ') : 'none'}`,
    );
  }
  if (keepAlive) {
    console.log('  mode:     running (Ctrl+C to stop)');
    await new Promise(() => {});
  }
} finally {
  await cleanup();
}
