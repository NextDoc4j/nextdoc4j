import { formatPlaygroundXml } from './body-format';
import type { buildDebugRequest } from './request';

export interface ResponseMetrics {
  contentType: string;
  duration: number;
  preparation?: number;
  requestBodySize: number;
  requestHeaderSize: number;
  responseBodySize: number;
  responseHeaderSize: number;
  status: number;
  statusText: string;
  timing?: {
    connect?: number;
    dns?: number;
    receive?: number;
    socket?: number;
    wait?: number;
  };
}

/**
 * Formats byte counts for the compact response summary.
 *
 * @param bytes Non-negative number of bytes.
 * @returns Human-readable bytes, KB or MB text.
 */
export const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Measures UTF-8 source text without claiming network-frame size.
 *
 * @param value Text whose encoded length is needed.
 * @returns UTF-8 byte count.
 */
export const measureText = (value: string) => new TextEncoder().encode(value).byteLength;

/**
 * Measures the request body available to the application before browser framing and compression.
 *
 * @param request Built request containing text fields, files or a direct body.
 * @returns File bytes plus UTF-8 text bytes when known.
 */
export const measureRequestBody = (request: ReturnType<typeof buildDebugRequest>) => {
  if (request.bodyKind === 'binary' && request.body instanceof File) return request.body.size;
  const multipartSize =
    request.formFiles.reduce((size, item) => size + item.file.size, 0) +
    request.formFields.reduce((size, item) => size + measureText(item.value), 0);
  return multipartSize || measureText(request.bodyPreview);
};

/**
 * Formats a readable response source while preserving the separately stored raw response.
 *
 * @param value Response text returned by the parser.
 * @param kind Parsed text or XML response type.
 * @returns Indented XML when valid, otherwise the original response text.
 */
export const formatResponseSource = (value: string, kind: 'binary' | 'json' | 'text' | 'xml') => {
  if (kind !== 'xml') return value;
  try {
    return formatPlaygroundXml(value);
  } catch {
    return value;
  }
};

/**
 * Reads a safe response download filename.
 *
 * @param response Completed Fetch response.
 * @returns Declared filename or a stable fallback.
 */
export const getDownloadFileName = (response: Response) => {
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename\*?=(?:UTF-8''|"?)([^;"\n]+)/iu);
  if (!match) return 'response-download';
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
};

/**
 * Reads browser-exposed resource timing without filling unavailable phases.
 *
 * @param url Exact request URL.
 * @returns Available DNS, socket, connection, wait and receive durations.
 */
export const getResourceTiming = (url: string): ResponseMetrics['timing'] => {
  const entry = performance.getEntriesByName(url).at(-1);
  if (!(entry instanceof PerformanceResourceTiming)) return undefined;
  /**
   * Keeps measured positive durations and treats zero-valued protected phases as unavailable.
   *
   * @param value Browser timing duration.
   * @returns Positive duration, or undefined when the phase was not exposed.
   */
  const positive = (value: number) => (value > 0 ? value : undefined);
  return {
    connect: positive(entry.connectEnd - entry.connectStart),
    dns: positive(entry.domainLookupEnd - entry.domainLookupStart),
    receive: positive(entry.responseEnd - entry.responseStart),
    socket: positive(entry.connectStart - entry.domainLookupEnd),
    wait: positive(entry.responseStart - entry.requestStart),
  };
};
