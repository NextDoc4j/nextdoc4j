export const largeResponseBytes = 1024 * 1024;
export const responsePreviewBytes = 256 * 1024;

/** Produces a UTF-8 bounded preview without splitting a multibyte character.
 * @param text Complete response text.
 * @param limit Maximum retained UTF-8 bytes.
 * @returns A prefix suitable for display; the caller retains the complete source.
 */
export function truncateResponsePreview(text: string, limit = responsePreviewBytes): string {
  const bytes = new TextEncoder().encode(text.slice(0, limit + 1));
  if (bytes.length <= limit) return text;
  return new TextDecoder().decode(bytes.subarray(0, limit), { stream: true });
}
