import {
  searchWordPattern,
  scoreSearchEntry,
  getSearchMatchSummary,
  retainSearchCandidate,
  type RankedSearchEntry,
} from './search-ranking';
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { IconCube, IconSearch, IconX } from '@tabler/icons-react';
import { Input } from '../../components/input';
import { Modal } from '../../components/modal';
import { SelectMenu } from '../../components/select-menu';
import { SegmentedControl } from '../../components/segmented-control';
import { useMovingHighlight } from '../../components/rare-ui/use-moving-highlight';
import { ContentTransition } from '../../components/rare-ui/content-transition';
import { useNotification } from '../../lib/notifications';
import type { DocumentationSource } from '../documentation/workspace';
import type { ServiceDefinition } from '../../types/openapi';
import { searchEntries, type SearchEntry, type SearchSource } from './search-index';
import '../../styles/global-search.css';

interface GlobalSearchProps {
  sources: DocumentationSource[];
  services: ServiceDefinition[];
  activeServiceUrl: string;
  serviceName: string;
  documents: SearchEntry[];
  loadSources: (service: ServiceDefinition, signal: AbortSignal) => Promise<SearchSource[]>;
  onSelect: (entry: SearchEntry) => Promise<void>;
  onClose: () => void;
}

// Retain one workspace index with per-service completion; identity changes invalidate metadata.
let completedIndex:
  | {
      sources: GlobalSearchProps['sources'];
      services: GlobalSearchProps['services'];
      documents: GlobalSearchProps['documents'];
      loadSources: GlobalSearchProps['loadSources'];
      activeServiceUrl: string;
      serviceName: string;
      entries: SearchEntry[];
      readyServices: Set<string>;
      failedServices: Set<string>;
      localReady: boolean;
    }
  | undefined;

/** Highlights literal query matches without interpreting user input as markup or regular expressions.
 * @param text Result title or path.
 * @param query Active search phrase.
 * @returns Plain text interspersed with safe highlight nodes.
 */
function highlight(text: string, query: string): ReactNode {
  const words = [...new Set(query.trim().toLowerCase().split(/\s+/).filter(Boolean))];
  if (!words.length) return text;
  const pattern = words
    .sort((left, right) => right.length - left.length)
    .map(searchWordPattern)
    .join('|');
  const matches = new Set(words);
  return text
    .split(new RegExp(`(${pattern})`, 'giu'))
    .map((part, index) =>
      matches.has(part.toLowerCase()) ? <mark key={index}>{part}</mark> : part,
    );
}

/**
 * Presents the shared command-search dialog with cancellable, time-sliced indexing and retrieval.
 * @param props Current sources, available services, document metadata and navigation callbacks.
 * @returns A keyboard-accessible palette rendering at most 80 matching cards.
 */
export function GlobalSearch({
  sources,
  services,
  activeServiceUrl,
  serviceName,
  documents,
  loadSources,
  onSelect,
  onClose,
}: GlobalSearchProps) {
  const cachedIndex = useMemo(
    () =>
      completedIndex &&
      completedIndex.sources === sources &&
      completedIndex.services === services &&
      completedIndex.documents === documents &&
      completedIndex.loadSources === loadSources &&
      completedIndex.activeServiceUrl === activeServiceUrl &&
      completedIndex.serviceName === serviceName
        ? completedIndex
        : undefined,
    [sources, services, documents, loadSources, activeServiceUrl, serviceName],
  );
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [scope, setScope] = useState('all');
  const [revision, setRevision] = useState(0);
  const [indexing, setIndexing] = useState(
    !cachedIndex || !cachedIndex.localReady || cachedIndex.failedServices.size > 0,
  );
  const [failures, setFailures] = useState(cachedIndex?.failedServices.size ?? 0);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(0);
  const [result, setResult] = useState<{
    buckets: Record<string, SearchEntry[]>;
    counts: Record<string, number>;
    keyword: string;
    scope: string;
  }>({ buckets: {}, counts: {}, keyword: '', scope: 'all' });
  const entries = result.buckets[kind] ?? [];
  const [pendingEnter, setPendingEnter] = useState<{
    keyword: string;
    scope: string;
    kind: string;
  }>();
  const openingRef = useRef(false);
  const pointerRef = useRef<{ x: number; y: number } | undefined>(undefined);
  const keyboardRef = useRef(false);
  const flushSearchRef = useRef<(() => void) | undefined>(undefined);
  const lastSearchRef = useRef({ keyword: '', scope: 'all' });
  const indexRef = useRef<SearchEntry[]>(cachedIndex?.entries ?? []);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useMovingHighlight(
    listRef,
    '.command-search__item',
    '.command-search__item.is-active',
    true,
    '.command-search__item.is-active',
  );
  const id = useId();
  const notify = useNotification();

  useEffect(() => {
    const controller = new AbortController();
    const cache = cachedIndex ?? {
      sources,
      services,
      documents,
      loadSources,
      activeServiceUrl,
      serviceName,
      entries: [...documents],
      readyServices: new Set<string>(),
      failedServices: new Set<string>(),
      localReady: false,
    };
    completedIndex = cache;
    indexRef.current = cache.entries;
    setRevision((value) => value + 1);
    setFailures(cache.failedServices.size);
    const pending = services.filter(
      (service) =>
        !service.disabled &&
        service.url !== activeServiceUrl &&
        !cache.readyServices.has(service.url),
    );
    setIndexing(!cache.localReady || pending.length > 0);

    /** Builds one service transactionally so failure or cancellation cannot publish duplicate partial rows.
     * @param sourceRows Lazy metadata for exactly one service.
     * @returns Whether a complete service index was appended before cancellation.
     */
    const append = async (sourceRows: Generator<SearchEntry>): Promise<boolean> => {
      const staged: SearchEntry[] = [];
      let started = performance.now();
      for (const entry of sourceRows) {
        if (controller.signal.aborted) return false;
        staged.push(entry);
        if (performance.now() - started >= 4) {
          await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
          started = performance.now();
        }
      }
      if (controller.signal.aborted) return false;
      cache.entries = cache.entries.concat(staged);
      indexRef.current = cache.entries;
      setRevision((value) => value + 1);
      return true;
    };

    /** Reuses successful services and retries only missing or failed service metadata.
     * @param None; consumes the currently available service queue.
     * @returns Completion after at most two concurrent background loaders finish.
     */
    const build = async () => {
      if (!cache.localReady) {
        try {
          cache.localReady = await append(searchEntries(sources, serviceName, activeServiceUrl));
          if (cache.localReady) cache.failedServices.delete(activeServiceUrl);
        } catch {
          if (!controller.signal.aborted) cache.failedServices.add(activeServiceUrl);
        }
      }
      if (controller.signal.aborted) return;
      setFailures(cache.failedServices.size);
      let next = 0;
      /** Indexes queued services independently, retaining successful metadata across dialog openings.
       * @param None; reads the shared next-service cursor.
       * @returns Completion when the queue is exhausted or cancelled.
       */
      const worker = async () => {
        while (!controller.signal.aborted && next < pending.length) {
          const service = pending[next++];
          try {
            const remote = await loadSources(service, controller.signal);
            if (await append(searchEntries(remote, service.name, service.url))) {
              cache.readyServices.add(service.url);
              cache.failedServices.delete(service.url);
            }
          } catch {
            if (!controller.signal.aborted) cache.failedServices.add(service.url);
          }
          if (!controller.signal.aborted) setFailures(cache.failedServices.size);
        }
      };
      await Promise.all([worker(), worker()]);
      if (!controller.signal.aborted) setIndexing(false);
    };
    void build();
    return () => controller.abort();
  }, [sources, services, documents, activeServiceUrl, serviceName, loadSources, cachedIndex]);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const keyword = query.trim().toLowerCase();
    setSearching(Boolean(keyword));
    if (!keyword) {
      lastSearchRef.current = { keyword, scope };
      setResult({ buckets: {}, counts: {}, keyword, scope });
      return;
    }
    const words = keyword.split(/\s+/);
    let cursor = 0;
    const index = indexRef.current;
    const length = index.length;
    const buckets: Record<string, RankedSearchEntry[]> = {
      all: [],
      api: [],
      model: [],
      document: [],
    };
    const counts: Record<string, number> = { all: 0, api: 0, model: 0, document: 0 };
    /** Scans normalized metadata within a four-millisecond main-thread budget.
     * @param None; resumes the current query cursor.
     * @returns Nothing; publishes counts and a bounded result list only for the latest query.
     */
    const scan = () => {
      if (cancelled) return;
      const started = performance.now();
      while (cursor < length && performance.now() - started < 4) {
        const entry = index[cursor++];
        if (scope !== 'all' && entry.serviceUrl !== scope) continue;
        const score = scoreSearchEntry(entry, words);
        if (score < 0) continue;
        counts.all += 1;
        counts[entry.kind] += 1;
        const candidate = { entry, score };
        retainSearchCandidate(buckets.all, candidate);
        retainSearchCandidate(buckets[entry.kind], candidate);
      }
      if (cursor < length) timer = window.setTimeout(scan, 0);
      else {
        flushSearchRef.current = undefined;
        setResult({
          buckets: Object.fromEntries(
            Object.entries(buckets).map(([key, items]) => [key, items.map((item) => item.entry)]),
          ),
          counts,
          keyword,
          scope,
        });
        setSearching(false);
      }
    };
    const queryChanged =
      lastSearchRef.current.keyword !== keyword || lastSearchRef.current.scope !== scope;
    lastSearchRef.current = { keyword, scope };
    flushSearchRef.current = () => {
      window.clearTimeout(timer);
      scan();
    };
    if (queryChanged) timer = window.setTimeout(scan, 120);
    else scan();
    return () => {
      cancelled = true;
      flushSearchRef.current = undefined;
      window.clearTimeout(timer);
    };
  }, [query, scope, revision]);

  useEffect(() => {
    setActive(0);
    listRef.current?.scrollTo({ top: 0 });
  }, [kind, query, scope]);

  useEffect(() => {
    if (!keyboardRef.current) return;
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  /** Navigates once, keeping the dialog available for retry when service loading fails.
   * @param entry Selected result and its service-aware destination.
   * @returns Completion after navigation or a global failure notification.
   */
  const select = useCallback(
    async (entry: SearchEntry) => {
      if (
        openingRef.current ||
        searching ||
        result.keyword !== query.trim().toLowerCase() ||
        result.scope !== scope
      )
        return;
      openingRef.current = true;
      setPendingEnter(undefined);
      setBusy(true);
      try {
        await onSelect(entry);
        onClose();
      } catch {
        notify('目标文档暂时无法打开，请重试');
      } finally {
        openingRef.current = false;
        setBusy(false);
      }
    },
    [searching, result.keyword, result.scope, query, scope, onSelect, onClose, notify],
  );

  useEffect(() => {
    if (!pendingEnter) return;
    if (
      pendingEnter.keyword !== query.trim().toLowerCase() ||
      pendingEnter.scope !== scope ||
      pendingEnter.kind !== kind
    ) {
      setPendingEnter(undefined);
      return;
    }
    if (searching || result.keyword !== pendingEnter.keyword || result.scope !== scope) return;
    const target = result.buckets[kind]?.[0];
    if (target) {
      setPendingEnter(undefined);
      void select(target);
    } else if (!indexing) setPendingEnter(undefined);
  }, [pendingEnter, query, scope, kind, searching, result, indexing, select]);

  return (
    <Modal
      open
      onClose={onClose}
      title="全局搜索"
      className="command-search"
      busy={busy}
      footer={
        <>
          <span>↑ ↓ 选择 · ↵ 打开 · Esc 关闭</span>
          <span aria-live="polite">
            {busy
              ? '正在打开…'
              : searching
                ? '正在搜索…'
                : indexing
                  ? '正在加载搜索范围…'
                  : failures
                    ? `${failures} 个服务加载失败`
                    : '搜索已加载文档'}
            {entries.length === 80 ? ' · 最多显示 80 条，请细化关键词' : ''}
          </span>
        </>
      }
    >
      <div
        className="command-search__content"
        onKeyDown={(event) => {
          if (
            !event.nativeEvent.isComposing &&
            !event.altKey &&
            !event.shiftKey &&
            (event.metaKey || event.ctrlKey) &&
            event.key.toLowerCase() === 'k'
          ) {
            event.preventDefault();
            if (!busy) onClose();
          }
        }}
      >
        <div className="command-search__input">
          <IconSearch size={18} />
          <Input
            ref={inputRef}
            autoFocus
            variant="embedded"
            aria-label="搜索接口、模型和文档"
            role="combobox"
            aria-expanded={!!query.trim()}
            aria-controls={id}
            aria-autocomplete="list"
            aria-activedescendant={entries[active] ? `${id}-${active}` : undefined}
            placeholder="搜索接口、模型和文档…"
            value={query}
            maxLength={200}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                keyboardRef.current = true;
                setActive((value) =>
                  Math.max(
                    0,
                    Math.min(entries.length - 1, value + (event.key === 'ArrowDown' ? 1 : -1)),
                  ),
                );
              }
              if (event.key === 'Enter' && query.trim()) {
                event.preventDefault();
                if (
                  searching ||
                  result.keyword !== query.trim().toLowerCase() ||
                  result.scope !== scope
                ) {
                  setPendingEnter({ keyword: query.trim().toLowerCase(), scope, kind });
                  if (result.keyword === query.trim().toLowerCase() || searching)
                    flushSearchRef.current?.();
                } else if (entries[active]) void select(entries[active]);
              }
            }}
          />
          {query && (
            <button
              type="button"
              aria-label="清空搜索"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
            >
              <IconX size={16} />
            </button>
          )}
          <button type="button" disabled={busy} onClick={onClose}>
            <kbd>Esc</kbd>
          </button>
        </div>
        {query.trim() && (
          <div className="command-search__filters">
            <SegmentedControl
              ariaLabel="搜索类型"
              value={kind}
              onChange={setKind}
              options={[
                ['all', '全部'],
                ['api', '接口'],
                ['model', '模型'],
                ['document', '文档'],
              ].map(([value, label]) => ({
                value,
                label: `${label} ${result.counts[value] ?? 0}`,
              }))}
            />
            {services.length > 0 && (
              <SelectMenu
                ariaLabel="搜索服务"
                value={scope}
                onChange={setScope}
                options={[
                  { value: 'all', label: '全部服务' },
                  ...services
                    .filter((service) => !service.disabled)
                    .map((service) => ({ value: service.url, label: service.name })),
                ]}
              />
            )}
          </div>
        )}
        <ContentTransition
          className="command-search__results rare-moving-menu rare-moving-options"
          containerRef={listRef}
          id={id}
          role="listbox"
          aria-label="搜索结果"
          aria-busy={searching}
          transitionKey={
            !query.trim() ? 'idle' : entries.length ? 'results' : searching ? 'searching' : 'empty'
          }
        >
          {!query.trim() ? (
            <div className="command-search__empty">
              <IconSearch size={28} />
              <p>输入关键词，快速定位接口、模型和文档</p>
              <small>支持接口标题、路径、HTTP 方法、模型名称和文档标题</small>
              <div className="command-search__suggestions">
                {[
                  'GET',
                  'POST',
                  ...indexRef.current
                    .slice(0, 20)
                    .filter((entry) => entry.kind === 'api')
                    .slice(0, 2)
                    .map((entry) => entry.path),
                ].map((word, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setQuery(word);
                      inputRef.current?.focus();
                    }}
                  >
                    {word}
                  </button>
                ))}
              </div>
            </div>
          ) : !entries.length ? (
            <div className="command-search__empty">
              {searching ? '正在搜索…' : '没有匹配结果，试试名称或路径片段'}
            </div>
          ) : (
            entries.map((entry, i) => {
              const summary = getSearchMatchSummary(entry, result.keyword);
              return (
                <div
                  role="option"
                  aria-selected={active === i}
                  id={`${id}-${i}`}
                  key={entry.id}
                  data-index={i}
                  className={`command-search__item ${active === i ? 'is-active' : ''}`}
                  onMouseMove={(event) => {
                    const previous = pointerRef.current;
                    const moved = previous
                      ? Math.hypot(event.clientX - previous.x, event.clientY - previous.y) >= 2
                      : Boolean(event.movementX || event.movementY);
                    if (!moved) return;
                    pointerRef.current = { x: event.clientX, y: event.clientY };
                    keyboardRef.current = false;
                    setActive(i);
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void select(entry)}
                >
                  <div className="command-search__top">
                    <span>{highlight(entry.title, result.keyword)}</span>
                    <small>
                      {entry.kind === 'model' ? (
                        <IconCube aria-hidden="true" size={15} stroke={1.8} />
                      ) : (
                        <b>{entry.kind === 'api' ? '</>' : '#'}</b>
                      )}{' '}
                      {entry.group}
                    </small>
                    <span className="command-search__service">
                      {entry.service}
                      {entry.serviceUrl && entry.serviceUrl !== activeServiceUrl ? ' ↵' : ''}
                    </span>
                  </div>
                  <div className="command-search__path">
                    <strong data-method={entry.method.toLowerCase()}>
                      {highlight(entry.method, result.keyword)}
                    </strong>
                    <code>{highlight(entry.path, result.keyword)}</code>
                  </div>
                  {summary && (
                    <div className="command-search__match">
                      <span>{summary.label}匹配：</span>
                      {highlight(summary.text, result.keyword)}
                    </div>
                  )}
                  <div className="command-search__breadcrumb">
                    {entry.service} / {entry.group} / {entry.title}
                  </div>
                </div>
              );
            })
          )}
        </ContentTransition>
      </div>
    </Modal>
  );
}
