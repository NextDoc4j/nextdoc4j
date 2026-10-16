import { AnimatedCounter } from '../../components/rare-ui/animated-counter';
import { SegmentedControl } from '../../components/segmented-control';
import { Input } from '../../components/input';
import { useMovingHighlight } from '../../components/rare-ui/use-moving-highlight';
import { memo, useMemo, useRef, useState } from 'react';

import { IconChevronRight, IconSearch } from '@tabler/icons-react';

import type { ApiOperation, OpenApiDocument } from '../../types/openapi';
import { groupOperations } from '../openapi/utils';

interface OverviewProps {
  document: OpenApiDocument;
  onSelect: (operation: ApiOperation) => void;
  operations: ApiOperation[];
  title?: string;
}

const methodOrder = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;

/**
 * Builds the semantic CSS modifier used by overview method labels and method-stat cards.
 *
 * @param method HTTP method in either uppercase or lowercase form.
 * @returns A stable lowercase class suffix for the supplied method.
 */
const getMethodToneClass = (method: string) => `is-${method.toLocaleLowerCase()}`;

/**
 * Converts an operation description to the concise text shown in the overview list.
 *
 * @param value Markdown or HTML-like description text from an operation.
 * @returns A whitespace-normalized plain-text description.
 */
const toPlainText = (value?: string) =>
  (value ?? '')
    .replaceAll(/<[^>]*>/gu, ' ')
    .replaceAll('&nbsp;', ' ')
    .replaceAll(/\s+/gu, ' ')
    .trim();

/**
 * Renders the legacy group overview with search, method filters and grouped operation rows.
 *
 * @param props Active document, visible operations, optional source title and selection callback.
 * @returns A filterable operation overview that keeps the legacy document scan rhythm.
 */
export const Overview = memo(function Overview({
  document,
  onSelect,
  operations,
  title,
}: OverviewProps) {
  const [keyword, setKeyword] = useState('');
  const [activeMethod, setActiveMethod] = useState('');
  const displayTitle = title || document.info?.title || '所有接口';
  const methodStats = useMemo(() => {
    const counter = new Map<string, number>();
    operations.forEach((operation) => {
      const method = operation.method.toUpperCase();
      counter.set(method, (counter.get(method) ?? 0) + 1);
    });
    return methodOrder
      .filter((method) => counter.has(method))
      .map((method) => ({
        count: counter.get(method) ?? 0,
        method,
      }));
  }, [operations]);
  const filteredOperations = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase();
    return operations.filter((operation) => {
      if (activeMethod && operation.method.toUpperCase() !== activeMethod) return false;
      if (!normalizedKeyword) return true;
      return [
        operation.summary,
        operation.path,
        toPlainText(operation.description),
        ...(operation.tags ?? []),
      ]
        .join(' ')
        .toLocaleLowerCase()
        .includes(normalizedKeyword);
    });
  }, [activeMethod, keyword, operations]);
  const groupSections = useMemo(
    () =>
      groupOperations(document, {}, filteredOperations).map(([name, items]) => ({ items, name })),
    [document, filteredOperations],
  );
  const showSectionHeader = groupSections.length > 1;
  const isFiltering = Boolean(keyword.trim() || activeMethod);
  const sectionsRef = useRef<HTMLDivElement>(null);
  useMovingHighlight(
    sectionsRef,
    '.legacy-overview__api-list button',
    undefined,
    groupSections.length > 0,
  );

  return (
    <div className="legacy-overview">
      <header className="legacy-overview__header">
        <div className="legacy-overview__header-info">
          <div className="legacy-overview__title-line">
            <h1>{displayTitle}</h1>
            <span>
              <AnimatedCounter value={operations.length} /> 个接口
            </span>
          </div>
          <p>点击任意接口查看详情</p>
        </div>
        {methodStats.length > 0 && (
          <div className="legacy-overview__stats">
            {methodStats.map((item) => (
              <span
                className={`legacy-overview__stat ${getMethodToneClass(item.method)}`}
                key={item.method}
              >
                <i />
                <b>{item.method}</b>
                <strong>
                  <AnimatedCounter value={item.count} />
                </strong>
              </span>
            ))}
          </div>
        )}
      </header>

      {operations.length > 0 && (
        <div className="legacy-overview__toolbar">
          <label className="legacy-overview__search ui-input-shell">
            <IconSearch aria-hidden="true" size={16} stroke={2} />
            <Input
              variant="embedded"
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索接口名称、路径、描述或标签"
              type="search"
              value={keyword}
            />
            {keyword && (
              <button aria-label="清空搜索" onClick={() => setKeyword('')} type="button">
                ×
              </button>
            )}
          </label>
          <SegmentedControl
            ariaLabel="接口方法筛选"
            autoWidth
            className={`legacy-overview__filters ${getMethodToneClass(activeMethod || 'all')}`}
            value={activeMethod}
            onChange={setActiveMethod}
            options={[
              { value: '', label: '全部' },
              ...methodStats.map((item) => ({ value: item.method, label: item.method })),
            ]}
          />
        </div>
      )}

      {groupSections.length > 0 ? (
        <div
          className="legacy-overview__sections rare-moving-fields rare-moving-overview"
          ref={sectionsRef}
        >
          {groupSections.map((section) => (
            <section className="legacy-overview__section" key={section.name}>
              {showSectionHeader && (
                <header>
                  <h2>{section.name}</h2>
                  <span>{section.items.length} 个接口</span>
                </header>
              )}
              <ul className="legacy-overview__api-list">
                {section.items.map((operation) => {
                  return (
                    <li
                      key={`${operation.sourceGroupId || 'all'}:${operation.method}:${operation.path}`}
                    >
                      <button
                        className={getMethodToneClass(operation.method)}
                        onClick={() => onSelect(operation)}
                        type="button"
                      >
                        <span
                          className={`legacy-overview__method ${getMethodToneClass(operation.method)}`}
                        >
                          {operation.method.toUpperCase()}
                        </span>
                        <span className="legacy-overview__api-main">
                          <span className="legacy-overview__api-top">
                            <b>{operation.summary || '未命名接口'}</b>
                            {(operation.tags ?? []).map((tag) => (
                              <i key={tag}>{tag}</i>
                            ))}
                          </span>
                          <span className="legacy-overview__api-bottom">
                            <code>{operation.path}</code>
                            {toPlainText(operation.description) && (
                              <small>{toPlainText(operation.description)}</small>
                            )}
                          </span>
                        </span>
                        <IconChevronRight
                          aria-hidden="true"
                          className="legacy-overview__api-arrow"
                          size={16}
                          stroke={2}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="legacy-overview__empty">
          <p>{isFiltering ? '没有找到匹配的接口' : '该分组下暂无接口'}</p>
          {isFiltering && (
            <button
              onClick={() => {
                setActiveMethod('');
                setKeyword('');
              }}
              type="button"
            >
              清空筛选
            </button>
          )}
        </div>
      )}
    </div>
  );
});
