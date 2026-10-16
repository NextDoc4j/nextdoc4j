/**
 * Utility functions for detecting and extracting Base64 images from API responses.
 */

export interface Base64ImageInfo {
  keyPath: string;
  dataUrl: string;
  rawBase64: string;
  format: string; // 'PNG' | 'JPEG' | 'GIF' | 'WEBP' | 'SVG' | 'BMP' | 'IMAGE'
  approxBytes: number;
}

const DATA_URL_PREFIX = 'data:image/';
const BASE64_MARKER = ';base64,';

/**
 * Known base64 magic bytes for common image formats:
 * - PNG: iVBORw0KGgo (89 50 4E 47 0D 0A 1A 0A)
 * - JPEG: /9j/ (FF D8 FF)
 * - GIF: R0lGOD (GIF87a or GIF89a)
 * - WebP: UklGR (RIFF)
 * - SVG: PHN2Zy (<svg) or PD94bW (<?xml)
 * - BMP: Qk (BM)
 */
const MAGIC_FORMAT_MAP: Array<{ prefix: string; format: string; mime: string }> = [
  { prefix: 'iVBORw0KGgo', format: 'PNG', mime: 'image/png' },
  { prefix: '/9j/', format: 'JPEG', mime: 'image/jpeg' },
  { prefix: 'R0lGOD', format: 'GIF', mime: 'image/gif' },
  { prefix: 'UklGR', format: 'WEBP', mime: 'image/webp' },
  { prefix: 'PHN2Zy', format: 'SVG', mime: 'image/svg+xml' },
  { prefix: 'PD94bW', format: 'SVG', mime: 'image/svg+xml' },
  { prefix: 'Qk', format: 'BMP', mime: 'image/bmp' },
];

/**
 * Formats byte counts into human readable sizes.
 */
export function formatImageBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Rapid O(1) check on a short prefix string (first ~60 chars) to determine if it could be a base64 image.
 * Avoids expensive slicing or allocations on huge 100KB+ strings.
 */
export function isPossibleBase64Prefix(prefix: string): boolean {
  if (!prefix || prefix.length < 10) return false;
  let p = prefix.trim();
  if (p.startsWith('"') || p.startsWith("'")) {
    p = p.slice(1);
  }
  if (p.startsWith(DATA_URL_PREFIX)) return true;
  for (const magic of MAGIC_FORMAT_MAP) {
    if (p.startsWith(magic.prefix)) return true;
  }
  return false;
}

/**
 * Estimates byte size from a base64 string length.
 */
export function estimateBase64Size(base64Str: string): number {
  const len = base64Str.length;
  if (!len) return 0;
  let padding = 0;
  if (base64Str.endsWith('==')) padding = 2;
  else if (base64Str.endsWith('=')) padding = 1;
  return Math.max(0, Math.floor((len * 3) / 4) - padding);
}

/**
 * Inspects a string value to determine if it is a Base64 encoded image.
 * Supports standard data:image/... DataURLs and raw base64 image strings matching magic bytes.
 */
export function detectBase64Image(raw: string, keyPath = 'image'): Base64ImageInfo | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.length < 32) return null;

  // 1. Check Data URL format: data:image/...;base64,...
  if (trimmed.startsWith(DATA_URL_PREFIX)) {
    const markerIndex = trimmed.indexOf(BASE64_MARKER);
    if (markerIndex > DATA_URL_PREFIX.length) {
      const mimeSub = trimmed.slice(DATA_URL_PREFIX.length, markerIndex).toLowerCase();
      const payload = trimmed.slice(markerIndex + BASE64_MARKER.length);
      if (payload.length >= 16) {
        let format = mimeSub.toUpperCase();
        if (format.includes('+')) format = format.split('+')[0];
        if (format.includes('JPEG') || format.includes('JPG')) format = 'JPEG';

        return {
          keyPath,
          dataUrl: trimmed,
          rawBase64: payload,
          format,
          approxBytes: estimateBase64Size(payload),
        };
      }
    }
  }

  // 2. Check Raw Base64 string with magic byte signatures
  if (trimmed.length >= 64) {
    for (const magic of MAGIC_FORMAT_MAP) {
      if (trimmed.startsWith(magic.prefix)) {
        // Quick verification that first 64 chars are valid base64 chars
        if (/^[A-Za-z0-9+/=]+$/.test(trimmed.slice(0, 64))) {
          return {
            keyPath,
            dataUrl: `data:${magic.mime};base64,${trimmed}`,
            rawBase64: trimmed,
            format: magic.format,
            approxBytes: estimateBase64Size(trimmed),
          };
        }
      }
    }
  }

  return null;
}

/**
 * Scans an API response (JSON or raw text) to collect all Base64 images.
 */
export function scanImagesFromResponse(text: string, parsedJson?: unknown): Base64ImageInfo[] {
  const results: Base64ImageInfo[] = [];
  const visitedDataUrls = new Set<string>();

  const pushIfValid = (info: Base64ImageInfo | null) => {
    if (!info) return;
    if (visitedDataUrls.has(info.dataUrl)) return;
    visitedDataUrls.add(info.dataUrl);
    results.push(info);
  };

  // Traverse JSON structure if available
  const traverse = (node: unknown, path: string, depth = 0) => {
    if (depth > 12) return;
    if (typeof node === 'string') {
      pushIfValid(detectBase64Image(node, path));
    } else if (Array.isArray(node)) {
      node.forEach((item, index) => {
        traverse(item, `${path}[${index}]`, depth + 1);
      });
    } else if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(node)) {
        const nextPath = path ? `${path}.${key}` : key;
        traverse(value, nextPath, depth + 1);
      }
    }
  };

  if (parsedJson !== undefined && parsedJson !== null) {
    traverse(parsedJson, '');
  } else if (text) {
    // Try to parse as JSON first
    try {
      const json = JSON.parse(text);
      traverse(json, '');
    } catch {
      // Raw string fallback: search for data:image/ or magic strings
      pushIfValid(detectBase64Image(text, 'response'));
    }
  }

  return results;
}
