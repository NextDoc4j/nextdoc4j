import { webcrypto } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createId } from '../../src/lib/id';

afterEach(() => vi.unstubAllGlobals());

describe('browser-compatible UUIDs', () => {
  it('uses native UUID generation when available', () => {
    const uuid = '627c9eb2-3d68-4d85-ae10-b8ae56129715';
    const randomUUID = vi.fn(() => uuid);
    vi.stubGlobal('crypto', { randomUUID });

    expect(createId()).toBe(uuid);
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it('creates distinct UUID v4 identities without the secure-context UUID API', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: webcrypto.getRandomValues.bind(webcrypto),
    });

    const ids = Array.from({ length: 20 }, () => createId());

    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) =>
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/),
    );
  });
});
