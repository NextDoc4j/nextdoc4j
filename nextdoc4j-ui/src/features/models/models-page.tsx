import { JsonDescriptionToggle } from '../../components/json-description-toggle';
import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  IconArrowsDiagonal,
  IconArrowsDiagonalMinimize,
  IconSearch,
  IconX,
} from '@tabler/icons-react';
import { Input } from '../../components/input';
import { Tooltip } from '../../components/tooltip';
import { CodeEditor, type CodeEditorFieldMeta } from '../../components/code-editor';
import { MarkdownContent } from '../documentation/markdown-content';
import { ModelSchemaFields } from '../documentation/request-parameters';
import {
  createJsonExamplePreview,
  findJsonExampleNode,
  stringifyJsonExample,
} from '../documentation/json-example-model';
import { getSchemaEnumItems, isIntegerSchema } from '../openapi/schema';
import type { OpenApiDocument, Schema } from '../../types/openapi';

interface ModelsPageProps {
  document: OpenApiDocument;
  selectedName?: string;
}

/**
 * Presents one model using the approved floating-card layout and shared schema/code components.
 * @param props Active class name, original schema and component registry.
 * @returns Searchable field tree and a pure JSON card with copy and fold controls.
 */
function ModelDetail({
  name,
  schema,
  document,
}: {
  name: string;
  schema: Schema;
  document: OpenApiDocument;
}) {
  const layoutRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [variants, setVariants] = useState(new Map<string, number>());
  const [fold, setFold] = useState({ collapsed: false, revision: 0 });
  const [showDescriptions, setShowDescriptions] = useState(true);
  const schemas = useMemo(() => document.components?.schemas ?? {}, [document.components?.schemas]);
  const preview = useMemo(
    () =>
      createJsonExamplePreview(
        { schema },
        { direction: 'model', schemas, variants },
        document.components,
        '',
      ),
    [schema, schemas, variants, document.components],
  );
  const jsonText = preview.tree ? stringifyJsonExample(preview.tree.value) : '';
  const propertyCount = Object.keys(preview.schema.properties ?? {}).length;

  const getFieldMeta = (path: Array<string | number>): CodeEditorFieldMeta | undefined => {
    const node = findJsonExampleNode(preview.tree, path);
    if (!node) return undefined;
    const nodeSchema = node.schema;
    const enums = getSchemaEnumItems(nodeSchema);
    const type = isIntegerSchema(nodeSchema)
      ? 'integer'
      : Array.isArray(nodeSchema.type)
        ? nodeSchema.type.join(' | ')
        : nodeSchema.type ||
          (nodeSchema.properties ? 'object' : nodeSchema.items ? 'array' : undefined);
    return {
      type,
      description: nodeSchema.description?.trim() || nodeSchema.title?.trim(),
      enums: enums.length ? enums : undefined,
    };
  };

  const getFieldDescription = (path: Array<string | number>): string => {
    const node = findJsonExampleNode(preview.tree, path);
    return node?.schema.description?.trim() || node?.schema.title?.trim() || '';
  };

  useLayoutEffect(() => {
    const layout = layoutRef.current;
    const scrollport = layout?.closest<HTMLElement>('.workspace-content-main');
    if (!layout || !scrollport) return;

    /** Aligns the sticky card with its initial position and the available workspace height.
     * @param None; reads layout spacing and the workspace scroll container.
     * @returns Nothing; updates the card's sticky offset and maximum height.
     */
    const updateCardBounds = () => {
      const style = getComputedStyle(layout);
      const top =
        Math.max(
          0,
          layout.getBoundingClientRect().top -
            scrollport.getBoundingClientRect().top +
            scrollport.scrollTop,
        ) + (parseFloat(style.paddingTop) || 0);
      layout.style.setProperty('--entity-model-top', `${top}px`);
      layout.style.setProperty(
        '--entity-model-height',
        `${Math.max(0, scrollport.clientHeight - top - (parseFloat(style.paddingBottom) || 0))}px`,
      );
    };
    updateCardBounds();
    const observer = new ResizeObserver(updateCardBounds);
    observer.observe(scrollport);
    observer.observe(layout);
    Array.from(scrollport.children).forEach((child) => {
      if (!child.contains(layout)) observer.observe(child);
    });
    window.addEventListener('resize', updateCardBounds);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateCardBounds);
    };
  }, []);

  return (
    <div className="legacy-entity entity-model">
      <div className="legacy-entity__layout entity-model__layout" ref={layoutRef}>
        <section
          className="entity-model__surface entity-model__detail"
          aria-label={`${name} 字段定义`}
        >
          <header className="entity-model__hero">
            <h1>{name}</h1>
            {preview.schema.description ? (
              <MarkdownContent
                className="entity-model__description"
                content={preview.schema.description}
              />
            ) : (
              <p className="entity-model__description">暂无模型描述</p>
            )}
          </header>
          <div className="entity-model__toolbar">
            <h2>
              字段信息 <span>{propertyCount || '结构定义'}</span>
            </h2>
            <label className="entity-model__search ui-input-shell">
              <IconSearch size={13} stroke={1.8} aria-hidden="true" />
              <Input
                variant="embedded"
                aria-label="搜索模型字段或描述"
                placeholder="搜索字段或描述"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && (
                <button aria-label="清空字段搜索" onClick={() => setQuery('')} type="button">
                  <IconX size={13} aria-hidden="true" />
                </button>
              )}
            </label>
          </div>
          <ModelSchemaFields
            schema={schema}
            schemas={schemas}
            query={query}
            variants={variants}
            onVariantsChange={setVariants}
          />
        </section>
        <aside className="entity-model__surface entity-model__json" aria-label={`${name} JSON`}>
          <div className="entity-model__json-actions">
            <Tooltip content={fold.collapsed ? '展开全部 JSON' : '折叠全部 JSON'}>
              <button
                aria-label={fold.collapsed ? '展开全部 JSON' : '折叠全部 JSON'}
                disabled={!jsonText}
                onClick={() =>
                  setFold((current) => ({
                    collapsed: !current.collapsed,
                    revision: current.revision + 1,
                  }))
                }
                type="button"
              >
                {fold.collapsed ? (
                  <IconArrowsDiagonal size={15} aria-hidden="true" />
                ) : (
                  <IconArrowsDiagonalMinimize size={15} aria-hidden="true" />
                )}
              </button>
            </Tooltip>
            <JsonDescriptionToggle visible={showDescriptions} onChange={setShowDescriptions} />
          </div>
          {preview.tree ? (
            <div className="entity-model__json-content">
              <CodeEditor
                readOnly
                fold={fold}
                language="json"
                value={jsonText}
                showAnnotations={showDescriptions}
                hoverTooltip={false}
                truncateLongStrings={true}
                getFieldMeta={getFieldMeta}
                getFieldDescription={getFieldDescription}
              />
            </div>
          ) : (
            <p className="entity-model__empty">{preview.message || '暂无 JSON 结构'}</p>
          )}
        </aside>
      </div>
    </div>
  );
}

/**
 * Selects the active entity model while retaining the workspace's existing navigation and routes.
 * @param props Active OpenAPI document and selected model identifier.
 * @returns The model detail, or a clear empty state when no valid selection exists.
 */
export const ModelsPage = memo(function ModelsPage({ document, selectedName }: ModelsPageProps) {
  const schema = selectedName ? document.components?.schemas?.[selectedName] : undefined;
  if (schema && selectedName)
    return (
      <ModelDetail key={selectedName} name={selectedName} schema={schema} document={document} />
    );
  return (
    <div className="legacy-entity entity-model">
      <div className="legacy-entity__layout entity-model__layout entity-model__layout--empty">
        <section className="entity-model__surface entity-model__detail">
          <header className="entity-model__hero">
            <h1>实体模型</h1>
            <p className="entity-model__description">
              {Object.keys(document.components?.schemas ?? {}).length
                ? '请从左侧菜单选择一个具体实体。'
                : '当前文档没有可展示的实体模型。'}
            </p>
          </header>
        </section>
      </div>
    </div>
  );
});
