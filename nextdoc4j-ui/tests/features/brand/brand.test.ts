// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import builtInBrandLogo from '../../../src/assets/logo.png';
import {
  brandStorageKeys,
  defaultBrandLogo,
  defaultBrandTitle,
  readStoredBrand,
  resolveBrandMetadata,
  writeStoredBrand,
} from '../../../src/features/brand/brand';
import { applicationLocalStorage } from '../../../src/features/workspace/storage/browser-storage';
import type { OpenApiDocument } from '../../../src/types/openapi';

describe('resolveBrandMetadata', () => {
  it('falls back to default title and logo when document is null or undefined', () => {
    const brand = resolveBrandMetadata(null);
    expect(brand.title).toBe(defaultBrandTitle);
    expect(brand.logo).toBe(defaultBrandLogo);
    expect(brand.hasCustomTitle).toBe(false);
    expect(brand.hasCustomLogo).toBe(false);
    expect(brand.footerText).toBeUndefined();
  });

  it('uses info.title when x-nextdoc4j brand is not provided', () => {
    const doc: OpenApiDocument = {
      info: { title: 'NextDoc4j Demo', version: '1.0.0' },
      openapi: '3.0.3',
      paths: {},
    };
    const brand = resolveBrandMetadata(doc);
    expect(brand.title).toBe('NextDoc4j Demo');
    expect(brand.hasCustomTitle).toBe(true);
    expect(brand.logo).toBe(builtInBrandLogo);
    expect(brand.hasCustomLogo).toBe(false);
  });

  it('prioritizes x-nextdoc4j.brand.title over info.title', () => {
    const doc: OpenApiDocument = {
      info: { title: 'Standard Title', version: '1.0.0' },
      openapi: '3.0.3',
      paths: {},
      'x-nextdoc4j': {
        brand: {
          footerText: '© 2026 Custom Corp',
          logo: 'https://example.com/logo.svg',
          title: 'Custom Brand Title',
        },
      },
    };
    const brand = resolveBrandMetadata(doc);
    expect(brand.title).toBe('Custom Brand Title');
    expect(brand.logo).toBe('https://example.com/logo.svg');
    expect(brand.footerText).toBe('© 2026 Custom Corp');
    expect(brand.hasCustomTitle).toBe(true);
    expect(brand.hasCustomLogo).toBe(true);
  });

  it('respects provided fallback options when document has no title', () => {
    const doc: OpenApiDocument = {
      openapi: '3.0.3',
      paths: {},
    };
    const brand = resolveBrandMetadata(doc, {
      fallbackLogo: 'https://example.com/fallback.png',
      fallbackTitle: 'Previous Snapshot Title',
    });
    expect(brand.title).toBe('Previous Snapshot Title');
    expect(brand.logo).toBe('https://example.com/fallback.png');
    expect(brand.hasCustomTitle).toBe(false);
  });
});

describe('readStoredBrand & writeStoredBrand', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it.each([defaultBrandLogo, undefined, '   '])(
    'removes the previous custom logo when replaced with %s',
    (logo) => {
      writeStoredBrand(
        { logo: 'https://example.com/old.png', title: 'Demo' },
        applicationLocalStorage,
      );
      writeStoredBrand({ logo, title: 'Demo' }, applicationLocalStorage);

      expect(applicationLocalStorage.getItem(brandStorageKeys.logo)).toBeNull();
      expect(readStoredBrand(applicationLocalStorage)).toEqual({ logo: undefined, title: 'Demo' });
    },
  );

  it('does not read or overwrite global brand keys when application storage is supplied', () => {
    const otherBrand = { logo: 'https://example.com/other.png', title: 'Other application' };
    writeStoredBrand(otherBrand);

    expect(readStoredBrand(applicationLocalStorage)).toEqual({ logo: undefined, title: undefined });

    const currentBrand = { logo: 'https://example.com/current.png', title: 'Current application' };
    writeStoredBrand(currentBrand, applicationLocalStorage);

    expect(readStoredBrand(applicationLocalStorage)).toEqual(currentBrand);
    expect(readStoredBrand()).toEqual(otherBrand);

    writeStoredBrand(
      { logo: defaultBrandLogo, title: 'Current application' },
      applicationLocalStorage,
    );
    expect(readStoredBrand(applicationLocalStorage).logo).toBeUndefined();
    expect(readStoredBrand()).toEqual(otherBrand);
  });

  it('persists and recovers brand title and custom logo across storage', () => {
    localStorage.clear();
    writeStoredBrand(
      { logo: 'https://example.com/custom.png', title: 'NextDoc4j Demo' },
      localStorage,
    );

    expect(localStorage.getItem(brandStorageKeys.title)).toBe('NextDoc4j Demo');
    expect(localStorage.getItem(brandStorageKeys.logo)).toBe('https://example.com/custom.png');

    const restored = readStoredBrand(localStorage);
    expect(restored.title).toBe('NextDoc4j Demo');
    expect(restored.logo).toBe('https://example.com/custom.png');
  });

  it('does not persist default built-in logo to keep storage clean', () => {
    localStorage.clear();
    writeStoredBrand({ logo: defaultBrandLogo, title: 'NextDoc4j Demo' }, localStorage);

    expect(localStorage.getItem(brandStorageKeys.title)).toBe('NextDoc4j Demo');
    expect(localStorage.getItem(brandStorageKeys.logo)).toBeNull();
  });
});
