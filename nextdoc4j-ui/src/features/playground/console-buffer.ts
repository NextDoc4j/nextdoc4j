import type { ConsoleLogEntry } from './pre-post-types';

const maxEntries = 500;
const maxBytes = 2 * 1024 * 1024;
const maxEntryBytes = 64 * 1024;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Keeps display logs bounded without changing workflow values or results. */
export class ConsoleBuffer {
  private entries: Array<{ entry: ConsoleLogEntry; bytes: number }> = [];
  private bytes = 0;
  private dropped = 0;

  /** Adds one log, truncating oversized display fields and evicting old entries.
   * @param entry Original workflow log, never mutated.
   * @returns Nothing; retains at most 500 entries and 2 MiB of text.
   */
  append(entry: ConsoleLogEntry): void {
    const copy = { ...entry };
    let remaining = maxEntryBytes;
    for (const key of ['phase', 'status', 'time', 'category', 'content'] as const) {
      const value = copy[key];
      if (value === undefined) continue;
      const encoded = encoder.encode(value.slice(0, remaining + 1));
      if (encoded.length > remaining) {
        const marker = '…[已截断]';
        const limit = Math.max(0, remaining - encoder.encode(marker).length);
        const prefix = decoder.decode(encoded.subarray(0, limit), { stream: true });
        decoder.decode();
        // Phase and status are bounded enum literals; only free text can reach this branch.
        if (key === 'time' || key === 'category' || key === 'content')
          copy[key] = remaining >= encoder.encode(marker).length ? prefix + marker : '';
      }
      remaining -= encoder.encode(copy[key] ?? '').length;
    }
    const bytes = maxEntryBytes - remaining;
    this.entries.push({ entry: copy, bytes });
    this.bytes += bytes;
    while (this.entries.length > maxEntries || this.bytes > maxBytes) {
      this.bytes -= this.entries.shift()!.bytes;
      this.dropped++;
    }
  }

  /** Removes history and omitted counters after an explicit clear or scope change.
   * @param None.
   * @returns Nothing.
   */
  clear(): void {
    this.entries = [];
    this.bytes = 0;
    this.dropped = 0;
  }

  /** Creates a bounded, independent display snapshot.
   * @param None.
   * @returns Retained logs, their text byte count and omitted entry count.
   */
  snapshot() {
    return {
      logs: this.entries.map(({ entry }) => entry),
      bytes: this.bytes,
      dropped: this.dropped,
    };
  }
}
