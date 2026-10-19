import path from 'node:path';
import { repoRoot } from '../common.mjs';

const serviceNames = ['user', 'system', 'file'];

function serviceDefinition(boot, name, port, readinessPath) {
  return {
    name,
    module: `nextdoc4j-demo/nextdoc4j-demo-boot${boot}/nextdoc4j-demo-boot${boot}-service-${name}`,
    port,
    readinessPath,
  };
}

const services = {
  sb3: {
    user: serviceDefinition(3, 'user', 9002, '/api/admin/v3/api-docs'),
    system: serviceDefinition(3, 'system', 9004, '/v3/api-docs'),
    file: serviceDefinition(3, 'file', 9003, '/v3/api-docs'),
  },
  sb4: {
    user: serviceDefinition(4, 'user', 9102, '/api/admin/v3/api-docs'),
    system: serviceDefinition(4, 'system', 9104, '/v3/api-docs'),
    file: serviceDefinition(4, 'file', 9103, '/v3/api-docs'),
  },
};

function profile({ id, boot, stack, runtime, module, port, previewPort }) {
  return {
    id,
    boot,
    stack,
    runtime,
    module,
    port,
    previewPort,
    services: stack === 'gateway' ? services[`sb${boot}`] : {},
  };
}

export const demoProfiles = {
  'sb3-single-webmvc': profile({
    id: 'sb3-single-webmvc',
    boot: 3,
    stack: 'single',
    runtime: 'webmvc',
    module: 'nextdoc4j-demo/nextdoc4j-demo-boot3/nextdoc4j-demo-boot3-monolith',
    port: 8000,
    previewPort: 18000,
  }),
  'sb3-single-webflux': profile({
    id: 'sb3-single-webflux',
    boot: 3,
    stack: 'single',
    runtime: 'webflux',
    module: 'nextdoc4j-demo/nextdoc4j-demo-boot3/nextdoc4j-demo-boot3-monolith-webflux',
    port: 8001,
    previewPort: 18001,
  }),
  'sb4-single-webmvc': profile({
    id: 'sb4-single-webmvc',
    boot: 4,
    stack: 'single',
    runtime: 'webmvc',
    module: 'nextdoc4j-demo/nextdoc4j-demo-boot4/nextdoc4j-demo-boot4-monolith',
    port: 8100,
    previewPort: 18010,
  }),
  'sb4-single-webflux': profile({
    id: 'sb4-single-webflux',
    boot: 4,
    stack: 'single',
    runtime: 'webflux',
    module: 'nextdoc4j-demo/nextdoc4j-demo-boot4/nextdoc4j-demo-boot4-monolith-webflux',
    port: 8101,
    previewPort: 18011,
  }),
  'sb3-gateway-webflux': profile({
    id: 'sb3-gateway-webflux',
    boot: 3,
    stack: 'gateway',
    runtime: 'webflux',
    module: 'nextdoc4j-demo/nextdoc4j-demo-boot3/nextdoc4j-demo-boot3-gateway-webflux',
    port: 9000,
    previewPort: 18100,
  }),
  'sb3-gateway-webmvc': profile({
    id: 'sb3-gateway-webmvc',
    boot: 3,
    stack: 'gateway',
    runtime: 'webmvc',
    module: 'nextdoc4j-demo/nextdoc4j-demo-boot3/nextdoc4j-demo-boot3-gateway-webmvc',
    port: 9001,
    previewPort: 18101,
  }),
  'sb4-gateway-webflux': profile({
    id: 'sb4-gateway-webflux',
    boot: 4,
    stack: 'gateway',
    runtime: 'webflux',
    module: 'nextdoc4j-demo/nextdoc4j-demo-boot4/nextdoc4j-demo-boot4-gateway-webflux',
    port: 9100,
    previewPort: 18110,
  }),
  'sb4-gateway-webmvc': profile({
    id: 'sb4-gateway-webmvc',
    boot: 4,
    stack: 'gateway',
    runtime: 'webmvc',
    module: 'nextdoc4j-demo/nextdoc4j-demo-boot4/nextdoc4j-demo-boot4-gateway-webmvc',
    port: 9101,
    previewPort: 18111,
  }),
};

export const defaultProfile = 'sb3-single-webmvc';
export { serviceNames };

export function resolveProfile(name = defaultProfile) {
  const profileValue = demoProfiles[name];
  if (!profileValue) {
    throw new Error(
      `Unknown Demo profile "${name}". Available profiles: ${Object.keys(demoProfiles).join(', ')}`,
    );
  }
  return profileValue;
}

export function moduleRoot(module) {
  return path.join(repoRoot, module);
}

export function moduleJar(module) {
  const root = moduleRoot(module);
  return path.join(root, 'target', `${path.basename(module)}.jar`);
}

export function profileServices(profileValue, configured) {
  if (profileValue.stack !== 'gateway') return [];
  if (!configured || configured.trim().toLowerCase() === 'all') {
    return serviceNames.map((name) => profileValue.services[name]);
  }
  if (configured.trim().toLowerCase() === 'none') return [];

  const names = [
    ...new Set(
      configured
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  const unknown = names.filter((name) => !profileValue.services[name]);
  if (unknown.length > 0) {
    throw new Error(
      `Gateway services contain unknown value(s): ${unknown.join(', ')}. Use user, system, file, all, or none.`,
    );
  }
  return names.map((name) => profileValue.services[name]);
}
