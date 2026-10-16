import { describe, expect, it } from 'vitest';

import type { OpenApiDocument, SwaggerConfig } from '../../../src/types/openapi';
import {
  mergeGatewaySecuritySchemes,
  withSecuritySchemes,
} from '../../../src/features/security/gateway-security';

const gatewayDocument: OpenApiDocument = {
  components: {
    securitySchemes: {
      shared: { in: 'header', name: 'X-Gateway-Key', type: 'apiKey' },
      gatewayOnly: { scheme: 'bearer', type: 'http' },
    },
  },
  info: { title: 'Gateway', version: '1.0.0' },
  openapi: '3.0.3',
  paths: {},
};
const gatewayConfig: SwaggerConfig = {
  'x-nextdoc4j-gateway': {
    globalSecuritySchemes: {
      globalOnly: { in: 'query', name: 'global_key', type: 'apiKey' },
      shared: { in: 'query', name: 'shared_key', type: 'apiKey' },
    },
  },
};
const serviceDocument: OpenApiDocument = {
  components: {
    schemas: { User: { type: 'object' } },
    securitySchemes: {
      serviceOnly: { scheme: 'basic', type: 'http' },
      shared: { in: 'cookie', name: 'service_session', type: 'apiKey' },
    },
  },
  info: { title: 'Service', version: '1.0.0' },
  openapi: '3.0.3',
  paths: {},
};

describe('gateway security compatibility', () => {
  it('uses service, gateway-global and gateway scheme precedence from the legacy debugger', () => {
    const schemes = mergeGatewaySecuritySchemes(serviceDocument, gatewayDocument, gatewayConfig);

    expect(Object.keys(schemes)).toEqual(['shared', 'gatewayOnly', 'globalOnly', 'serviceOnly']);
    expect(schemes.shared).toEqual({
      in: 'cookie',
      name: 'service_session',
      type: 'apiKey',
    });
  });

  it('does not replace service schemas when attaching merged security schemes', () => {
    const schemes = mergeGatewaySecuritySchemes(serviceDocument, gatewayDocument, gatewayConfig);
    const securedDocument = withSecuritySchemes(serviceDocument, schemes);

    expect(securedDocument.components?.schemas?.User).toEqual({ type: 'object' });
    expect(securedDocument.components?.securitySchemes).toBe(schemes);
    expect(serviceDocument.components?.securitySchemes).not.toBe(schemes);
  });
});
