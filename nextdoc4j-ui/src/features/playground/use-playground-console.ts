import { useCallback, useEffect, useRef, useState } from 'react';
import { ConsoleBuffer } from './console-buffer';
import type { ConsoleLogEntry } from './pre-post-types';

/** Batches bounded console history for one mounted interface.
 * @param scope Interface identity; changes clear history and scheduled publication.
 * @returns Logs, omitted count and append, flush and clear operations.
 */
export function usePlaygroundConsole(scope: string) {
  const [buffer] = useState(() => new ConsoleBuffer());
  const [snapshot, setSnapshot] = useState(() => buffer.snapshot());
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(true);
  /** Publishes accumulated logs and cancels the pending batch timer.
   * @param None.
   * @returns Nothing; unmounted consumers are ignored.
   */
  const flush = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = undefined;
    if (mounted.current) setSnapshot(buffer.snapshot());
  }, [buffer]);
  /** Appends a log without scheduling more than one publication per batch.
   * @param entry Workflow or network display log.
   * @returns Nothing.
   */
  const append = useCallback(
    (entry: ConsoleLogEntry) => {
      if (!mounted.current) return;
      buffer.append(entry);
      timer.current ??= setTimeout(flush, 100);
    },
    [buffer, flush],
  );
  /** Clears both published and queued history.
   * @param None.
   * @returns Nothing.
   */
  const clear = useCallback(() => {
    buffer.clear();
    flush();
  }, [buffer, flush]);
  useEffect(() => {
    mounted.current = true;
    clear();
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
      timer.current = undefined;
      buffer.clear();
    };
  }, [scope, buffer, clear]);
  return {
    consoleLogs: snapshot.logs,
    consoleDropped: snapshot.dropped,
    appendLog: append,
    flushLogs: flush,
    clearLogs: clear,
  };
}
