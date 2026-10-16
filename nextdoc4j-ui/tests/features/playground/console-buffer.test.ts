import { describe, expect, it } from 'vitest';
import { ConsoleBuffer } from '../../../src/features/playground/console-buffer';

describe('bounded console history', () => {
  it('retains ordered tail entries and resets omitted counts', () => {
    const buffer = new ConsoleBuffer();
    for (let i = 0; i < 10000; i++)
      buffer.append({ phase: 'net', category: 'NET', time: '12:00', content: String(i) });
    expect(buffer.snapshot().logs).toHaveLength(500);
    expect(buffer.snapshot().logs[0].content).toBe('9500');
    expect(buffer.snapshot().dropped).toBe(9500);
    buffer.clear();
    expect(buffer.snapshot()).toEqual({ logs: [], bytes: 0, dropped: 0 });
  });
  it('bounds UTF-8 bytes without mutating source logs or splitting characters', () => {
    const buffer = new ConsoleBuffer();
    const entry = {
      phase: 'net' as const,
      category: 'NET',
      time: 'now',
      content: '中文🚀'.repeat(20000),
    };
    for (let i = 0; i < 100; i++) buffer.append(entry);
    const snapshot = buffer.snapshot();
    expect(snapshot.bytes).toBeLessThanOrEqual(2 * 1024 * 1024);
    expect(snapshot.logs[0].content).toContain('[已截断]');
    expect(snapshot.logs[0].content).not.toContain('�');
    expect(entry.content).not.toContain('[已截断]');
    expect(snapshot.dropped).toBeGreaterThan(0);
  });
});
