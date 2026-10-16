import { scanImagesFromResponse } from '../../utils/base64-image';
import { truncateResponsePreview } from './response-preview';

/** Parses full response JSON or creates a bounded formatted preview in a disposable worker.
 * @param text Complete JSON response, never a truncated preview.
 * @param signal Request or preview cancellation signal.
 * @param format False returns full JSON, true formats a preview, and images scans full text.
 * @returns Parsed JSON or formatted preview; rejects invalid JSON and cancellation.
 */
export async function processResponseJson(
  text: string,
  signal?: AbortSignal,
  format: boolean | 'images' = false,
): Promise<unknown> {
  signal?.throwIfAborted();
  if (typeof Worker === 'undefined') {
    if (format === 'images') return scanImagesFromResponse(text);
    const value: unknown = JSON.parse(text);
    return format ? truncateResponsePreview(JSON.stringify(value, null, 2)) : value;
  }
  const worker = new Worker(new URL('./response-json-worker.ts', import.meta.url), {
    type: 'module',
  });
  let abort: (() => void) | undefined;
  try {
    return await new Promise((resolve, reject) => {
      abort = () => reject(signal?.reason ?? new DOMException('已取消', 'AbortError'));
      signal?.addEventListener('abort', abort, { once: true });
      worker.onerror = (event) => reject(new Error(event.message || '响应解析失败'));
      worker.onmessageerror = () => reject(new Error('响应解析结果无法传递'));
      worker.onmessage = ({ data }: MessageEvent<{ value?: unknown; error?: string }>) => {
        if (data.error) reject(new SyntaxError(data.error));
        else resolve(data.value);
      };
      worker.postMessage({ text, format });
    });
  } finally {
    if (abort) signal?.removeEventListener('abort', abort);
    worker.terminate();
  }
}
