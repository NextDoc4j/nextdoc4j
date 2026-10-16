import { largeResponseBytes } from './response-preview';
import { processResponseJson } from './response-processing';
import type { SseEvent } from './types';

export interface ParsedResponse {
  contentType: string;
  data: Blob | string | unknown;
  kind: 'binary' | 'json' | 'text' | 'xml';
  rawText?: string;
  size: number;
}

/** Normalizes a response MIME type without its parameters.
 * @param value Raw Content-Type header.
 * @returns Lowercase MIME type or an empty string.
 */
const normalizeContentType = (value: null | string) =>
  (value || '').split(';')[0].trim().toLowerCase();

/** Recognizes JSON response media types.
 * @param value Normalized MIME type.
 * @returns Whether JSON decoding should be attempted.
 */
const isJsonContentType = (value: string) => value.includes('/json') || value.endsWith('+json');

/** Recognizes XML response media types.
 * @param value Normalized MIME type.
 * @returns Whether XML display formatting applies.
 */
const isXmlContentType = (value: string) => value.includes('/xml') || value.endsWith('+xml');

/** Recognizes response media types handled as downloadable binary data.
 * @param value Normalized MIME type.
 * @returns Whether the response should be read as a Blob.
 */
const isBinaryContentType = (value: string) =>
  value.startsWith('image/') ||
  value.startsWith('audio/') ||
  value.startsWith('video/') ||
  value.includes('application/octet-stream') ||
  value.includes('application/pdf') ||
  value.includes('application/zip');

/** Detects object or array JSON prefixes for responses without MIME metadata.
 * @param value Complete response text.
 * @returns Whether the prefix suggests JSON.
 */
const looksLikeJson = (value: string) => /^\s*[{[]/.test(value);
/** Detects XML declarations or element prefixes.
 * @param value Response text.
 * @returns Whether XML display is appropriate.
 */
const looksLikeXml = (value: string) => /^\s*<\?xml|^\s*<[A-Za-z][\w:.-]*/.test(value);

/**
 * Converts a regular Fetch response into a display-ready value.
 *
 * @param response Completed non-streaming browser response.
 * @param signal Optional cancellation signal for expensive JSON parsing.
 * @returns Response data, normalized content type, kind and byte size.
 */
export const parseDebugResponse = async (
  response: Response,
  signal?: AbortSignal,
): Promise<ParsedResponse> => {
  signal?.throwIfAborted();
  const contentType = normalizeContentType(response.headers.get('content-type'));
  if (
    isBinaryContentType(contentType) ||
    response.headers.get('content-disposition')?.split(';')[0].trim().toLowerCase() === 'attachment'
  ) {
    const data = await response.blob();
    signal?.throwIfAborted();
    return { contentType, data, kind: 'binary', size: data.size };
  }

  const text = await response.text();
  signal?.throwIfAborted();
  const size = new TextEncoder().encode(text).byteLength;
  if (isJsonContentType(contentType) || (!contentType && looksLikeJson(text))) {
    try {
      const data =
        size > largeResponseBytes ? await processResponseJson(text, signal) : JSON.parse(text);
      signal?.throwIfAborted();
      return { contentType, data, kind: 'json', rawText: text, size };
    } catch (error) {
      signal?.throwIfAborted();
      if (!(error instanceof SyntaxError)) throw error;
      return { contentType, data: text, kind: 'text', rawText: text, size };
    }
  }
  if (isXmlContentType(contentType) || looksLikeXml(text)) {
    return { contentType, data: text, kind: 'xml', rawText: text, size };
  }
  return { contentType, data: text, kind: 'text', rawText: text, size };
};

/**
 * Parses one SSE frame according to the event-stream wire format.
 *
 * @param block Raw SSE frame without the separating blank line.
 * @param sequence One-based event arrival order.
 * @param time Timestamp displayed beside the received event.
 * @returns Structured event, or null when the frame contains no data field.
 */
export const parseSseEventBlock = (
  block: string,
  sequence: number,
  time: string,
): SseEvent | null => {
  const dataLines: string[] = [];
  let event = 'message';
  let id: string | undefined;

  block
    .replaceAll('\r\n', '\n')
    .split('\n')
    .forEach((line) => {
      if (!line || line.startsWith(':')) return;
      const separatorIndex = line.indexOf(':');
      const field = separatorIndex < 0 ? line : line.slice(0, separatorIndex);
      const value = (separatorIndex < 0 ? '' : line.slice(separatorIndex + 1)).replace(/^ /, '');
      if (field === 'data') dataLines.push(value);
      if (field === 'event') event = value || 'message';
      if (field === 'id') id = value;
    });
  if (!dataLines.length) return null;
  const data = dataLines.join('\n');
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    // Event data can be any text payload.
  }
  return { data, event, id, parsed, sequence, time };
};

/**
 * Reads an SSE response incrementally and reports each complete event.
 *
 * @param response Streaming Fetch response.
 * @param onEvent Callback invoked for every parsed SSE event.
 * @returns A promise that resolves after stream completion.
 */
export const consumeSseStream = async (response: Response, onEvent: (event: SseEvent) => void) => {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let sequence = 0;
  const maxBlockLength = 1024 * 1024;
  /** Rejects oversized incomplete or complete events before parsing their fields.
   * @param block Buffered SSE event text.
   * @returns Nothing; throws a visible stream error above the character limit.
   */
  const checkBlock = (block: string) => {
    if (block.length > maxBlockLength) throw new Error('SSE 单条消息超过 1 Mi 字符，已停止接收');
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        buffer += decoder.decode();
        break;
      }
      buffer = (buffer + decoder.decode(value, { stream: true })).replaceAll('\r\n', '\n');
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() ?? '';
      checkBlock(buffer);
      blocks.forEach((block) => {
        checkBlock(block);
        const event = parseSseEventBlock(block, sequence + 1, new Date().toISOString());
        if (!event) return;
        sequence += 1;
        onEvent(event);
      });
    }
    checkBlock(buffer);
    if (buffer.trim()) {
      const event = parseSseEventBlock(buffer, sequence + 1, new Date().toISOString());
      if (event) onEvent(event);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
};
