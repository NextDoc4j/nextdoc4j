import net from 'node:net';
import path from 'node:path';
import {
  assertHttp,
  rootPom,
  runMaven,
  startJava,
  startPnpm,
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

function readProfileName() {
  const configured = optionValue('--profile');
  if (configured) return configured;
  return process.env.NEXTDOC4J_DEMO_PROFILE || defaultProfile;
}

function resolvePort(configuredUrl, configuredPort, defaultPort) {
  const port = configuredPort
    ? Number(configuredPort)
    : configuredUrl
      ? Number(new URL(configuredUrl).port) || defaultPort
      : defaultPort;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid development port: ${configuredPort || port}`);
  }
  return port;
}

function moduleStart(module, port, nacosPortOffset) {
  const root = moduleRoot(module);
  const javaOptions = nacosPortOffset ? [`-Dnacos.server.grpc.port.offset=${nacosPortOffset}`] : [];
  return {
    args: [...javaOptions, '-jar', path.relative(root, moduleJar(module)), `--server.port=${port}`],
    cwd: root,
  };
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
    throw new Error(
      `Development profile ports are already in use: ${occupied.join(', ')}. Stop the other Demo profile or use --existing.`,
    );
  }
}

const profile = resolveProfile(readProfileName());
const configuredBackendUrl = process.env.NEXTDOC4J_DEMO_BACKEND_URL?.replace(/\/+$/, '');
const configuredPort = process.env.NEXTDOC4J_DEMO_BACKEND_PORT;
const backendPort = resolvePort(configuredBackendUrl, configuredPort, profile.port);
const backendUrl = configuredBackendUrl || `http://127.0.0.1:${backendPort}`;
const uiPort = resolvePort(undefined, process.env.NEXTDOC4J_DEV_UI_PORT, 5777);
const backendMode = process.env.NEXTDOC4J_DEV_BACKEND_MODE || 'auto';
const forceJar = process.argv.includes('--jar');
const requireExisting = process.argv.includes('--existing');
const configuredServices =
  optionValue('--services') || process.env.NEXTDOC4J_DEMO_GATEWAY_SERVICES;
const selectedServices = profileServices(profile, configuredServices);
const configuredNacosGrpcPortOffset =
  profile.stack === 'gateway' ? process.env.NEXTDOC4J_DEV_NACOS_GRPC_PORT_OFFSET : undefined;
const nacosGrpcPortOffset = configuredNacosGrpcPortOffset?.trim();
if (
  nacosGrpcPortOffset &&
  (!/^\d+$/.test(nacosGrpcPortOffset) || Number(nacosGrpcPortOffset) > 65535)
) {
  throw new Error('Nacos gRPC port offset must be an integer from 0 to 65535');
}

if (!['auto', 'jar', 'existing'].includes(backendMode)) {
  throw new Error('NEXTDOC4J_DEV_BACKEND_MODE must be auto, jar, or existing');
}
if (forceJar && requireExisting) {
  throw new Error('--jar and --existing cannot be used together');
}

const shouldUseExisting = requireExisting || (!forceJar && backendMode === 'existing');
const shouldTryExisting = requireExisting || (!forceJar && backendMode !== 'jar');
const backendProcesses = [];
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

await assertPortsAvailable([uiPort]);
if (!usingExistingBackend) {
  const ports = [uiPort, backendPort, ...selectedServices.map((service) => service.port)];
  await assertPortsAvailable(ports);

  const modules = [profile.module, ...selectedServices.map((service) => service.module)];
  await runMaven(['-f', rootPom, '-pl', modules.join(','), '-am', 'package', '-DskipTests']);

  for (const service of selectedServices) {
    const start = moduleStart(service.module, service.port, nacosGrpcPortOffset);
    backendProcesses.push(startJava(start.args, { cwd: start.cwd }));
  }
  const primaryStart = moduleStart(profile.module, backendPort, nacosGrpcPortOffset);
  backendProcesses.push(startJava(primaryStart.args, { cwd: primaryStart.cwd }));
}

const ui = startPnpm(['run', 'dev', '--host', '0.0.0.0', '--port', String(uiPort)], {
  env: {
    VITE_DOC_PROXY_MODE: profile.stack === 'gateway' ? 'gateway' : 'single',
    VITE_GLOB_API_URL: '/api',
    VITE_API_PROXY_TARGET: backendUrl,
    VITE_GATEWAY_API_PROXY_TARGET: backendUrl,
  },
});

const cleanup = async () => {
  await Promise.all([stop(ui), ...backendProcesses.map((child) => stop(child))]);
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
  if (!usingExistingBackend && profile.stack === 'gateway') {
    await Promise.all(
      selectedServices.map((service) =>
        waitForHttp(`http://127.0.0.1:${service.port}${service.readinessPath}`, {
          isReady: (response) => response.status >= 200 && response.status < 300,
        }),
      ),
    );
  }

  const backendDocument = await waitForHttp(`${backendUrl}/v3/api-docs`, {
    isReady: (response) => response.status >= 200 && response.status < 300,
  });
  if (profile.stack === 'gateway' && !backendDocument.body.includes('"x-nextdoc4j-aggregation"')) {
    throw new Error(`Profile ${profile.id} expected a gateway aggregation document`);
  }
  await waitForHttp(`http://127.0.0.1:${uiPort}`, {
    isReady: (response) => response.status >= 200 && response.status < 300,
  });
  const frontendDocument = await assertHttp(
    `http://127.0.0.1:${uiPort}/api/v3/api-docs`,
    'frontend API proxy',
  );
  if (profile.stack === 'gateway' && !frontendDocument.body.includes('"x-nextdoc4j-aggregation"')) {
    throw new Error('Frontend API proxy did not return a gateway aggregation document');
  }

  console.log(`\nDevelopment profile is ready: ${profile.id}`);
  console.log(`  frontend: http://127.0.0.1:${uiPort}`);
  console.log(`  backend:  ${backendUrl}/doc.html`);
  if (profile.stack === 'gateway') {
    console.log(
      `  services: ${selectedServices.length > 0 ? selectedServices.map(({ name }) => name).join(', ') : 'none'}`,
    );
    console.log(`  nacos gRPC offset: ${nacosGrpcPortOffset || 'default (+100)'}`);
  }
  console.log(`  source:   ${usingExistingBackend ? 'existing service' : 'release script'}`);
  console.log('Press Ctrl+C to stop all processes.');

  await new Promise(() => {});
} finally {
  await cleanup();
}
