import { describe, expect, it } from 'vitest';

import type { OpenApiDocument, ServiceDefinition } from '../../../src/types/openapi';
import {
  isAggregationEnabled,
  markServiceUnavailable,
  probeServices,
  selectAvailableService,
  sortServices,
  toServiceDefinitions,
} from '../../../src/features/aggregation/service-manager';

const services: ServiceDefinition[] = [
  { name: '用户服务', url: '/users/v3/api-docs', 'x-order': 20 },
  { name: '系统服务', url: '/system/v3/api-docs', 'x-order': 10 },
  { name: '禁用服务', url: '/disabled/v3/api-docs', disabled: true },
];

const document: OpenApiDocument = {
  info: { title: 'Service', version: '1.0.0' },
  openapi: '3.0.3',
  paths: {},
};

describe('aggregation service manager', () => {
  it('enables aggregation only for an explicit boolean true extension', () => {
    expect(
      isAggregationEnabled({
        ...document,
        'x-nextdoc4j-aggregation': { aggregation: true },
      }),
    ).toBe(true);
    expect(isAggregationEnabled(document)).toBe(false);
    expect(
      isAggregationEnabled({
        ...document,
        'x-nextdoc4j-aggregation': { aggregation: 'true' },
      } as unknown as OpenApiDocument),
    ).toBe(false);
  });

  it('sorts and probes services without blocking on unavailable documents', async () => {
    const probed = await probeServices(services, async (service) => {
      if (service.url.includes('users')) throw new Error('gateway timeout');
      return document;
    });

    expect(probed.map((service) => service.name)).toEqual(['系统服务', '用户服务', '禁用服务']);
    expect(probed.map((service) => service.status)).toEqual(['UP', 'DOWN', 'DOWN']);
    expect(probed[1]?.reason).toBe('gateway timeout');
    expect(probed[2]?.reason).toContain('禁用');
    expect(probed[0]?.document).toBe(document);
  });

  it('restores a usable preferred service and falls back when needed', () => {
    const ordered = sortServices(services);

    expect(selectAvailableService(ordered, '/users/v3/api-docs')?.url).toBe('/users/v3/api-docs');
    expect(
      selectAvailableService(
        markServiceUnavailable(ordered, '/users/v3/api-docs', 'unavailable'),
        '/users/v3/api-docs',
      )?.url,
    ).toBe('/system/v3/api-docs');

    expect(
      selectAvailableService(
        ordered.map((service) => ({ ...service, disabled: true, status: 'DOWN' })),
      ),
    ).toBeUndefined();
  });

  it('removes transient document payloads before services enter UI state', async () => {
    const probed = await probeServices(services, async () => document);

    expect(toServiceDefinitions(probed)).toEqual([
      {
        contextPath: undefined,
        disabled: false,
        name: '系统服务',
        reason: '',
        serviceId: undefined,
        status: 'UP',
        url: '/system/v3/api-docs',
        'x-order': 10,
      },
      {
        contextPath: undefined,
        disabled: false,
        name: '用户服务',
        reason: '',
        serviceId: undefined,
        status: 'UP',
        url: '/users/v3/api-docs',
        'x-order': 20,
      },
      {
        contextPath: undefined,
        disabled: true,
        name: '禁用服务',
        reason: '服务已在网关配置中禁用',
        serviceId: undefined,
        status: 'DOWN',
        url: '/disabled/v3/api-docs',
        'x-order': undefined,
      },
    ]);
  });
});
