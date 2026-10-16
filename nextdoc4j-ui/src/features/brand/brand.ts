import builtInBrandLogo from '../../assets/logo.png';
import type { OpenApiDocument } from '../../types/openapi';

export interface BrandMetadata {
  footerText?: string;
  hasCustomLogo: boolean;
  hasCustomTitle: boolean;
  logo: string;
  title: string;
}

export const defaultBrandTitle = 'NextDoc4j';
export const defaultBrandLogo = builtInBrandLogo;

export const brandStorageKeys = {
  logo: 'nextdoc4j:brand:logo',
  title: 'nextdoc4j:brand:title',
} as const;

/**
 * Resolves brand metadata according to the Nextdoc4j specification:
 * 1. Title: x-nextdoc4j.brand.title -> info.title -> fallbackTitle (default: 'NextDoc4j')
 * 2. Logo: x-nextdoc4j.brand.logo -> fallbackLogo (default: built-in logo)
 * 3. Footer: x-nextdoc4j.brand.footerText
 *
 * @param document OpenAPI document that may contain x-nextdoc4j brand extensions or info.
 * @param options Fallback title, logo and explicit custom flag when document does not define them.
 * @returns Fully resolved brand metadata.
 */
export function resolveBrandMetadata(
  document?: OpenApiDocument | null,
  options?: {
    fallbackLogo?: string;
    fallbackTitle?: string;
    hasCustomTitle?: boolean;
  },
): BrandMetadata {
  const brand = document?.['x-nextdoc4j']?.brand;
  const brandTitle = brand?.title?.trim();
  const infoTitle = document?.info?.title?.trim();
  const effectiveTitle = brandTitle || infoTitle;

  const brandLogo = brand?.logo?.trim();

  const isCustomTitle =
    (effectiveTitle ? effectiveTitle.toLowerCase() !== defaultBrandTitle.toLowerCase() : false) ||
    options?.hasCustomTitle === true;

  return {
    footerText: brand?.footerText?.trim(),
    hasCustomLogo: Boolean(brandLogo && brandLogo !== defaultBrandLogo),
    hasCustomTitle: isCustomTitle,
    logo: brandLogo || options?.fallbackLogo || defaultBrandLogo,
    title: effectiveTitle || options?.fallbackTitle || defaultBrandTitle,
  };
}

/**
 * Reads previously persisted brand title and logo from browser storage.
 *
 * @param storage Exclusive storage target (defaults to localStorage when omitted).
 * @returns Stored title and logo, if present.
 */
export function readStoredBrand(storage?: Pick<Storage, 'getItem'>): {
  logo?: string;
  title?: string;
} {
  try {
    const targetStorage =
      storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
    const title = targetStorage?.getItem(brandStorageKeys.title)?.trim() || undefined;
    const logo = targetStorage?.getItem(brandStorageKeys.logo)?.trim() || undefined;
    return { logo, title };
  } catch {
    return {};
  }
}

/**
 * Persists brand title and logo to browser storage for instant recovery on reload.
 *
 * @param brand Resolved brand information to store.
 * @param storage Exclusive storage target (defaults to localStorage when omitted).
 * @returns Nothing; removes cached logos when the brand uses the default or has no logo.
 */
export function writeStoredBrand(
  brand: { logo?: string; title?: string },
  storage?: Pick<Storage, 'setItem' | 'removeItem'>,
): void {
  try {
    const targetStorage =
      storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
    const title = brand.title?.trim();
    const logo = brand.logo?.trim();

    if (title) {
      targetStorage?.setItem(brandStorageKeys.title, title);
    }
    if (logo && logo !== defaultBrandLogo) {
      targetStorage?.setItem(brandStorageKeys.logo, logo);
    } else {
      targetStorage?.removeItem(brandStorageKeys.logo);
    }
  } catch {
    // Storage write failures are silently ignored.
  }
}
