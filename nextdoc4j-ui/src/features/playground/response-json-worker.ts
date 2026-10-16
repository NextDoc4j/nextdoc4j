import { scanImagesFromResponse } from '../../utils/base64-image';
import { truncateResponsePreview } from './response-preview';

/** Parses or formats complete JSON off the UI thread.
 * @param event Complete JSON source and requested output mode.
 * @returns Nothing; posts the parsed value or a bounded formatted preview.
 */
self.onmessage = (event: MessageEvent<{ text: string; format: boolean | 'images' }>) => {
  try {
    if (event.data.format === 'images') {
      self.postMessage({ value: scanImagesFromResponse(event.data.text) });
      return;
    }
    const value: unknown = JSON.parse(event.data.text);
    self.postMessage({
      value: event.data.format ? truncateResponsePreview(JSON.stringify(value, null, 2)) : value,
    });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : String(error) });
  }
};
