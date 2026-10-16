import type {
  OpenApiDocument,
  Operation,
  SecurityRequirement,
  SecurityScheme,
} from '../../types/openapi';

export interface SecurityCredential {
  in: 'cookie' | 'header' | 'query';
  name: string;
  value: string;
}

export interface ResolvedSecurityScheme extends SecurityScheme {
  key: string;
}

const normalizeScheme = (value?: string) => value?.trim().toLowerCase() ?? '';

const encodeBasicCredentials = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCodePoint(byte);
  });
  return btoa(binary);
};

/**
 * Returns operation-level security when explicitly supplied, otherwise document security.
 *
 * @param operation OpenAPI operation that may override global security.
 * @param document Active OpenAPI document.
 * @returns Ordered OpenAPI security requirements; an empty array explicitly means anonymous.
 */
export const getEffectiveSecurityRequirements = (
  operation: Operation,
  document: OpenApiDocument,
): SecurityRequirement[] => operation.security ?? document.security ?? [];

/**
 * Gets the authentication requirements used by the legacy NextDoc4j debug panel.
 *
 * @param operation OpenAPI operation whose security field controls automatic credential injection.
 * @returns Operation-level requirements, or an empty list for anonymous and SaIgnore operations.
 */
export const getOperationSecurityRequirements = (operation: Operation): SecurityRequirement[] => {
  if (operation['x-nextdoc4j-security']?.ignore === true) return [];
  return operation.security ?? [];
};

/**
 * Resolves every named scheme used by an effective security requirement list.
 *
 * @param requirements OpenAPI security alternatives for an operation.
 * @param schemes Component security scheme registry.
 * @returns Known schemes in requirement order, excluding undefined references.
 */
export const resolveSecuritySchemes = (
  requirements: SecurityRequirement[],
  schemes: Record<string, SecurityScheme> = {},
): ResolvedSecurityScheme[] => {
  const seen = new Set<string>();
  const resolved: ResolvedSecurityScheme[] = [];

  requirements.forEach((requirement) => {
    Object.keys(requirement).forEach((key) => {
      if (seen.has(key) || !schemes[key]) return;
      seen.add(key);
      resolved.push({ ...schemes[key], key });
    });
  });
  return resolved;
};

/**
 * Lists every security scheme declared by an OpenAPI document.
 *
 * @param schemes Component security scheme registry.
 * @returns Declared schemes paired with the keys used in security requirements.
 */
export const getRegisteredSecuritySchemes = (
  schemes: Record<string, SecurityScheme> = {},
): ResolvedSecurityScheme[] => Object.entries(schemes).map(([key, scheme]) => ({ ...scheme, key }));

/**
 * Selects the first OpenAPI security alternative for which every credential has a value.
 *
 * @param requirements OpenAPI alternatives; each object is an AND group.
 * @param values User-entered credential values indexed by scheme key.
 * @returns A complete requirement group, or undefined when no alternative can authenticate.
 */
export const selectSatisfiedSecurityRequirement = (
  requirements: SecurityRequirement[],
  values: Record<string, string>,
) =>
  requirements.find((requirement) =>
    Object.keys(requirement).every((key) => Boolean(values[key]?.trim())),
  );

/**
 * Builds configured request credentials from one OpenAPI security alternative.
 *
 * @param requirement The selected AND group, which may still contain unconfigured schemes.
 * @param schemes Component security scheme registry.
 * @param values User-entered credential values indexed by scheme key.
 * @returns Available header, query and cookie values; missing credentials remain unfilled.
 */
export const buildSecurityCredentials = (
  requirement: SecurityRequirement | undefined,
  schemes: Record<string, SecurityScheme> = {},
  values: Record<string, string>,
): SecurityCredential[] => {
  if (!requirement) return [];

  return Object.keys(requirement).flatMap((key) => {
    const scheme = schemes[key];
    const value = values[key]?.trim();
    if (!scheme || !value) return [];

    if (scheme.type === 'apiKey') {
      const location = scheme.in;
      if (!location || !['cookie', 'header', 'query'].includes(location)) return [];
      return [{ in: location, name: scheme.name || key, value }];
    }

    if (scheme.type === 'oauth2' || scheme.type === 'openIdConnect') {
      return [
        {
          in: 'header',
          name: 'Authorization',
          value: /^Bearer\s+/iu.test(value) ? value : `Bearer ${value}`,
        },
      ];
    }
    if (scheme.type !== 'http') return [];
    const protocol = normalizeScheme(scheme.scheme);
    if (protocol === 'basic') {
      return [
        {
          in: 'header',
          name: 'Authorization',
          value: /^Basic\s+/iu.test(value) ? value : `Basic ${encodeBasicCredentials(value)}`,
        },
      ];
    }
    if (protocol === 'bearer') {
      return [
        {
          in: 'header',
          name: 'Authorization',
          value: /^Bearer\s+/iu.test(value) ? value : `Bearer ${value}`,
        },
      ];
    }
    return [{ in: 'header', name: 'Authorization', value }];
  });
};
