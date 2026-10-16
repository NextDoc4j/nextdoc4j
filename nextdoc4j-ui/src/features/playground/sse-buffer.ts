import type { SseEvent } from './types';

/** Bounds retained SSE history while counting all serialized event bytes incrementally. */
export class SseBuffer {
  private entries: Array<{ event: SseEvent; text: string; bytes: number }> = [];
  private encoder = new TextEncoder();
  private retainedBytes = 0;
  private totalBytes = 0;
  private dropped = 0;

  /**
   * Serializes an event once and evicts the oldest history over either retention limit.
   * @param event Newly parsed server event.
   * @returns Nothing; keeps at most 500 events and 2 MiB of serialized history.
   */
  append(event: SseEvent) {
    const text = `${event.id ? `id: ${event.id}\n` : ''}event: ${event.event}\ndata: ${event.data}\n\n`;
    const bytes = this.encoder.encode(text).byteLength;
    if (bytes > 1024 * 1024) throw new Error('SSE 单条消息超过 1 MiB，已停止接收');
    this.totalBytes += bytes;
    this.retainedBytes += bytes;
    this.entries.push({ event, text, bytes });
    while (this.entries.length > 500 || this.retainedBytes > 2 * 1024 * 1024) {
      this.retainedBytes -= this.entries.shift()!.bytes;
      this.dropped += 1;
    }
  }

  /**
   * Materializes only bounded history for a batched UI update.
   * @param None; reads the current retained events and cumulative counters.
   * @returns Independent event list, reconstructed text, cumulative bytes and omitted count.
   */
  snapshot() {
    return {
      events: this.entries.map((entry) => entry.event),
      raw: this.entries.map((entry) => entry.text).join(''),
      bytes: this.totalBytes,
      dropped: this.dropped,
    };
  }
}
