/**
 * Recursively sorts object keys while preserving array order for stable JSON serialization.
 *
 * @param value JSON-compatible value returned by a document endpoint.
 * @returns Equivalent value with deterministic object-key ordering.
 */
const normalizeJsonValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalizeJsonValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, normalizeJsonValue((value as Record<string, unknown>)[key])]),
  );
};

/**
 * Converts bytes to a lowercase hexadecimal digest string.
 *
 * @param bytes Hash bytes returned by the Web Crypto API.
 * @returns Lowercase hexadecimal representation.
 */
const toHex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes), (value) => value.toString(16).padStart(2, '0')).join('');

/**
 * Calculates a deterministic non-cryptographic fallback when Web Crypto is unavailable.
 *
 * @param value Stable serialized JSON text.
 * @returns Eight-character hexadecimal FNV-1a digest.
 */
const fallbackHash = (value: string) => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

/**
 * Produces deterministic JSON text for content comparison independent of object key order.
 *
 * @param value JSON-compatible document value.
 * @returns Stable serialized JSON text.
 */
export const stableStringify = (value: unknown) => JSON.stringify(normalizeJsonValue(value));

/**
 * Calculates a SHA-256 content identity for one JSON document.
 *
 * @param value JSON-compatible document value.
 * @returns SHA-256 fingerprint prefixed with its algorithm name.
 */
export const fingerprintJson = async (value: unknown) => {
  const serialized = stableStringify(value);
  if (!globalThis.crypto?.subtle) return `fnv1a:${fallbackHash(serialized)}`;
  const bytes = new TextEncoder().encode(serialized);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return `sha256:${toHex(digest)}`;
};
