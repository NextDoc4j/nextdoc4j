import type { DebugParameter, GlobalHeader } from './types';
import type { ResolvedSecurityScheme, SecurityCredential } from '../security/security';

export type ParameterLocation = 'header' | 'query' | 'cookie' | 'path';
export type ParameterOverrides = Record<string, { enabled?: boolean; value?: string }>;

/**
 * Identifies a parameter independently of its inherited source.
 * @param location Parameter injection location.
 * @param name Parameter name; Header names are case insensitive.
 * @returns A normalized identity shared by local, global and authentication values.
 */
export function parameterKey(location: ParameterLocation, name: string): string {
  return `${location}:${location === 'header' ? name.trim().toLowerCase() : name.trim()}`;
}

/**
 * Identifies the actual request field supplied by a declared authentication scheme.
 * @param scheme Registered OpenAPI scheme and its declaration key.
 * @returns Header, Query or Cookie target, or undefined for unsupported browser credentials.
 */
export function authenticationTarget(
  scheme: ResolvedSecurityScheme,
): Pick<SecurityCredential, 'in' | 'name'> | undefined {
  if (scheme.type === 'apiKey' && scheme.in)
    return { in: scheme.in, name: scheme.name || scheme.key };
  if (['http', 'oauth2', 'openIdConnect'].includes(scheme.type))
    return { in: 'header', name: 'Authorization' };
  return undefined;
}

/**
 * Collects explicit exclusions before any fallback values are injected.
 * @param location Parameter location to inspect.
 * @param local Current interface rows, including disabled entries.
 * @param overrides Session-only value and enable overrides.
 * @returns Keys that must remain absent from the final request.
 */
export function excludedParameterKeys(
  location: ParameterLocation,
  local: DebugParameter[],
  overrides: ParameterOverrides,
): Set<string> {
  const prefix = `${location}:`;
  const excluded = new Set<string>();
  const enabledKeys = new Set(
    local.filter((item) => item.enabled).map((item) => parameterKey(location, item.name)),
  );
  for (const item of local) {
    if (!item.name.trim()) continue;
    const key = parameterKey(location, item.name);
    if (!item.enabled && !enabledKeys.has(key) && overrides[key]?.enabled !== true)
      excluded.add(key);
  }
  for (const [key, override] of Object.entries(overrides)) {
    if (key.startsWith(prefix) && override.enabled === false) excluded.add(key);
  }
  return excluded;
}

/**
 * Resolves the same parameter values for the table and outgoing request.
 * @param location Target parameter location.
 * @param local Current interface parameters.
 * @param globals Inherited workspace defaults, including disabled rows.
 * @param credentials Available formatted authentication values.
 * @param overrides Explicit session overrides; an empty value remains an explicit override.
 * @param includeDisabled Whether to retain disabled defaults for table display.
 * @returns Effective parameters without mutating any inherited source.
 */
export function resolveRequestParameters(
  location: ParameterLocation,
  local: DebugParameter[],
  globals: GlobalHeader[],
  credentials: SecurityCredential[],
  overrides: ParameterOverrides,
  includeDisabled = false,
): DebugParameter[] {
  const excluded = excludedParameterKeys(location, local, overrides);
  const result = new Map<string, DebugParameter>();
  for (const item of globals) {
    result.set(parameterKey(location, item.name), {
      enabled: item.enabled !== false,
      name: item.name.trim(),
      value: item.value,
    });
  }
  for (const item of local) {
    const key = parameterKey(location, item.name);
    // Empty interface examples do not mask a configured inherited value.
    if (item.enabled && (!result.has(key) || item.value.trim()))
      result.set(key, { ...item, name: item.name.trim() });
  }
  for (const credential of credentials) {
    if (credential.in !== location) continue;
    const key = parameterKey(location, credential.name);
    const existing = result.get(key);
    if (!existing?.enabled || (location === 'header' && !existing.value.trim())) {
      result.set(key, { enabled: true, name: credential.name.trim(), value: credential.value });
    }
  }
  const resolved = [...result].flatMap(([key, item]) => {
    const effective = {
      ...item,
      ...overrides[key],
      ...(excluded.has(key) ? { enabled: false } : {}),
    };
    return effective.name && (includeDisabled || effective.enabled) ? [effective] : [];
  });
  if (location !== 'query' || includeDisabled) return resolved;
  // Preserve repeated interface Query values unless the inherited key is explicitly overridden.
  return resolved.flatMap((item) => {
    const key = parameterKey(location, item.name);
    const repeated = local.filter(
      (entry) => entry.enabled && parameterKey(location, entry.name) === key,
    );
    return repeated.length > 1 && !overrides[key]
      ? repeated.map((entry) => ({ ...entry, name: entry.name.trim() }))
      : [item];
  });
}
