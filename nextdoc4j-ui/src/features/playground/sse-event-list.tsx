import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import { AnimatedCopyButton } from '../../components/rare-ui/animated-copy-button';
import { Tooltip } from '../../components/tooltip';
import { CodeEditor } from '../../components/code-editor';
import type { Schema } from '../../types/openapi';
import type { SseEvent } from './types';

/**
 * Formats a received event timestamp compactly in the browser's local time zone.
 * @param time Original ISO timestamp captured when the event arrived.
 * @returns Local time with milliseconds, or the original text for an invalid timestamp.
 */
function formatEventTime(time: string): string {
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return time;
  return `${date.toLocaleTimeString('zh-CN', { hour12: false })}.${String(date.getMilliseconds()).padStart(3, '0')}`;
}

/**
 * Displays one compact event with stable JSON tree state as new events arrive.
 * @param props Received event, schema registry and callback for copying its original payload.
 * @returns A timeline row with event metadata and an unboxed text or JSON body.
 */
const SseMessage = memo(function SseMessage({
  event,
  onCopy,
}: {
  event: SseEvent;
  schemas: Record<string, Schema>;
  onCopy: (text: string) => Promise<boolean | void> | boolean | void;
}) {
  const formattedJson = useMemo(() => {
    if (event.parsed === undefined) return '';
    try {
      return JSON.stringify(event.parsed, null, 2);
    } catch {
      return String(event.parsed);
    }
  }, [event.parsed]);

  return (
    <li className="playground-event">
      <span aria-hidden="true" className="playground-event__marker" />
      <article>
        <header className="playground-event__header">
          <span className="playground-event__sequence">#{event.sequence}</span>
          <strong className="playground-event__type">{event.event}</strong>
          {event.id !== undefined && (
            <span className="playground-event__id" title={`事件 ID：${event.id}`}>
              ID {event.id || '""'}
            </span>
          )}
          <time dateTime={event.time} title={event.time}>
            {formatEventTime(event.time)}
          </time>
          <Tooltip content="复制消息内容">
            <AnimatedCopyButton
              className="playground-event__copy"
              aria-label={`复制第 ${event.sequence} 条消息`}
              text={event.data}
              onCopy={() => onCopy(event.data)}
              type="button"
            />
          </Tooltip>
        </header>
        {event.parsed !== undefined ? (
          <div className="playground-response__event-json">
            <CodeEditor
              readOnly
              language="json"
              value={formattedJson}
              showAnnotations={false}
              truncateLongStrings={true}
              defaultExpandLongStrings={true}
              hoverTooltip={false}
            />
          </div>
        ) : (
          <pre className="playground-event__text">{event.data || '（空消息）'}</pre>
        )}
      </article>
    </li>
  );
});

/**
 * Presents formatted SSE messages in arrival order without allocating empty space per event.
 * @param props Received messages, search text, connection status, schema registry and copy callback.
 * @returns A compact event timeline with readable pending and filtered-empty states.
 */
export function SseEventList({
  events,
  query,
  streaming,
  schemas,
  onCopy,
}: {
  events: SseEvent[];
  query: string;
  streaming: boolean;
  schemas: Record<string, Schema>;
  onCopy: (text: string) => Promise<boolean | void> | boolean | void;
}) {
  const normalizedQuery = query.trim().toLowerCase();
  const eventsRootRef = useRef<HTMLDivElement>(null);
  const visibleEvents = useMemo(
    () =>
      events.filter((event) =>
        `${event.event} ${event.id ?? ''} ${event.data}`.toLowerCase().includes(normalizedQuery),
      ),
    [events, normalizedQuery],
  );

  useLayoutEffect(() => {
    if (!visibleEvents.length) return;
    const frame = requestAnimationFrame(() => {
      const root = eventsRootRef.current;
      const scrollContainer = root?.closest<HTMLElement>('.playground-panel__body');
      if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
    });
    return () => cancelAnimationFrame(frame);
  }, [visibleEvents, streaming]);

  return (
    <div className="playground-events" ref={eventsRootRef}>
      <div className="playground-events__summary">
        <span className={streaming ? 'is-live' : ''}>
          <i aria-hidden="true" />
          {streaming ? '接收中' : '接收结束'}
        </span>
        <span>
          {normalizedQuery
            ? `${visibleEvents.length} / ${events.length} 条消息`
            : `${events.length} 条消息`}
        </span>
      </div>
      {visibleEvents.length ? (
        <ol className="playground-events__list" aria-label="SSE 消息列表">
          {visibleEvents.map((event) => (
            <SseMessage event={event} schemas={schemas} onCopy={onCopy} key={event.sequence} />
          ))}
        </ol>
      ) : (
        <p className="playground-events__empty">
          {normalizedQuery ? '没有匹配的消息' : streaming ? '连接已建立，等待消息…' : '未收到消息'}
        </p>
      )}
    </div>
  );
}
