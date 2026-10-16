import { HeightTransition } from '../../components/rare-ui/height-transition';
import { MovingHighlight } from '../../components/rare-ui/moving-highlight';
import { useNotification } from '../../lib/notifications';
import { Input } from '../../components/input';
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { IconChevronRight, IconSearch } from '@tabler/icons-react';

import { SegmentedControl } from '../../components/segmented-control';
import { SelectMenu } from '../../components/select-menu';
import { Tooltip } from '../../components/tooltip';
import { getSchemaEnumItems, hasSchemaDefaultValue } from '../openapi/schema';
import { getContentTypes, getDefaultContentType } from '../openapi/utils';
import { MarkdownContent } from './markdown-content';
import { SchemaFieldHead, SchemaMetadataRow as MetadataRow } from './schema-field-presentation';
import { ParameterTypeScriptPreview } from './parameter-typescript-preview';
import { createRequestTypes } from './parameter-typescript';
import {
  createRequestChildren,
  createRequestField,
  formatRequestValue,
  getRequestRanges,
  getRequestType,
  getRequestTypeLabel,
  getScalarArrayItem,
  hasRequestChildren,
  prepareRequestSchema,
  resolveRequestSchema,
  type RequestComposition,
  type RequestDisplaySchema,
  type RequestField,
  type RequestTreeContext,
} from './request-schema';
import type { ApiOperation, Parameter, Schema } from '../../types/openapi';

interface RequestParametersProps {
  contentType: string;
  onContentTypeChange: (value: string) => void;
  operation: ApiOperation;
  schemas: Record<string, Schema>;
  variants?: Map<string, number>;
  onVariantsChange?: Dispatch<SetStateAction<Map<string, number>>>;
}

interface RequestGroup {
  composition?: RequestComposition;
  fields: RequestField[];
  label: string;
  location: Parameter['in'] | 'body';
  omitted?: number;
  rootValue?: RequestField;
  schema?: RequestDisplaySchema;
  title: string;
}

interface RequestView {
  collapsed: Set<string>;
  copy: (value: unknown, label: string, onComplete?: (success: boolean) => void) => void;
  matches: (field: RequestField) => boolean;
  selectVariant: (key: string, index: number) => void;
  schemas: Record<string, Schema>;
  toggle: (key: string) => void;
}

const parameterLocations: Array<{
  label: string;
  location: Parameter['in'];
  title: string;
}> = [
  { label: 'Path', location: 'path', title: '路径参数' },
  { label: 'Query', location: 'query', title: '查询参数' },
  { label: 'Header', location: 'header', title: '请求头参数' },
  { label: 'Cookie', location: 'cookie', title: 'Cookie 参数' },
];

/**
 * Copies a selected example or field name using the shared operation feedback.
 *
 * @param props Original value, clipboard action and optional field label, content and styling.
 * @returns A copyable value whose result appears in the global notification center.
 */
function RequestExample({
  value,
  copy,
  children,
  className = 'operation-request__example',
  label = '示例值',
}: {
  value: unknown;
  copy: RequestView['copy'];
  children?: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <span className="operation-request__example-anchor">
      <button
        className={className}
        onClick={() => copy(value, `${label}已复制`)}
        title={`点击复制${label}`}
        type="button"
      >
        {children ?? <code>{formatRequestValue(value)}</code>}
      </button>
    </span>
  );
}

/**
 * Shows every declared example and restriction separately from the field headline.
 *
 * @param props Current field, copy action and optional array-element label prefix.
 * @returns Visible field and scalar-element metadata, omitting absent or duplicate examples.
 */
function RequestMetadata({
  field,
  copy,
  prefix = '',
}: {
  field: RequestField;
  copy: RequestView['copy'];
  prefix?: string;
}): ReactNode {
  const schema = field.schema;
  const scalarItem = getScalarArrayItem(field);
  const itemMetadata = scalarItem ? (
    <>
      {scalarItem.description && scalarItem.description !== field.description && (
        <dl className="operation-request__metadata">
          <MetadataRow label={`${prefix}元素说明`}>
            <MarkdownContent
              className="operation-request__field-description"
              content={scalarItem.description}
            />
          </MetadataRow>
        </dl>
      )}
      <RequestMetadata
        field={{
          ...scalarItem,
          examples: scalarItem.examples.filter(
            (example) =>
              !field.examples.some(
                (value) =>
                  typeof value === typeof example &&
                  formatRequestValue(value) === formatRequestValue(example),
              ),
          ),
        }}
        copy={copy}
        prefix="元素"
      />
    </>
  ) : null;
  const ranges = getRequestRanges(schema);
  const enums = getSchemaEnumItems(schema);
  const hasDefault = hasSchemaDefaultValue(schema.default);
  const rules = [
    ...(schema.uniqueItems ? ['元素唯一'] : []),
    ...(schema.nullable || schema.types?.includes('null') ? ['可空'] : []),
    ...(schema.deprecated ? ['已弃用'] : []),
    ...(schema.readOnly || schema.accessMode?.toUpperCase() === 'READ_ONLY' ? ['只读'] : []),
    ...(schema.writeOnly || schema.accessMode?.toUpperCase() === 'WRITE_ONLY' ? ['只写'] : []),
  ];
  const otherMetadata = [
    [
      '包含元素',
      schema.contains && (Object.keys(schema.contains).length ? schema.contains : '任意类型'),
    ],
    [
      '其余元素',
      schema.unevaluatedItems === false
        ? '不允许额外元素'
        : schema.unevaluatedItems &&
            typeof schema.unevaluatedItems === 'object' &&
            Object.keys(schema.unevaluatedItems).length
          ? schema.unevaluatedItems
          : undefined,
    ],
    ['类型标识', schema.discriminator?.propertyName],
    ['类型映射', schema.discriminator?.mapping],
    ['contentEncoding', schema.contentEncoding],
    ['contentMediaType', schema.contentMediaType],
  ] as const;
  const parameter = field.parameter;
  if (
    !field.examples.length &&
    !ranges.length &&
    !enums.length &&
    !schema.pattern &&
    !hasDefault &&
    !rules.length &&
    !field.encoding &&
    parameter?.style === undefined &&
    parameter?.explode === undefined &&
    !otherMetadata.some(([, value]) => value !== undefined) &&
    schema.format !== 'binary' &&
    schema.const === undefined
  )
    return itemMetadata;

  return (
    <>
      <dl className="operation-request__metadata">
        {field.examples.length > 0 && (
          <MetadataRow label={`${prefix}示例`}>
            <div className="operation-request__examples">
              {field.examples.map((example, index) => (
                <RequestExample copy={copy} key={index} label={`${prefix}示例值`} value={example} />
              ))}
            </div>
          </MetadataRow>
        )}
        {ranges.length > 0 && (
          <MetadataRow label={`${prefix}范围`}>
            <span className="operation-request__metadata-range">{ranges.join(' · ')}</span>
          </MetadataRow>
        )}
        {enums.length > 0 && (
          <MetadataRow label={`${prefix}枚举`}>
            <div className="operation-request__enums">
              {enums.map((item, index) => (
                <span key={`${item.value}:${index}`}>
                  <code>{formatRequestValue(item.value)}</code>
                  {item.description && <small>- {item.description}</small>}
                </span>
              ))}
            </div>
          </MetadataRow>
        )}
        {schema.pattern && (
          <MetadataRow label={`${prefix}正则`}>
            <code>{schema.pattern}</code>
          </MetadataRow>
        )}
        {hasDefault && (
          <MetadataRow label={`${prefix}默认值`}>
            <code>{formatRequestValue(schema.default)}</code>
          </MetadataRow>
        )}
        {schema.const !== undefined && (
          <MetadataRow label={`${prefix}固定值`}>
            <code>{formatRequestValue(schema.const)}</code>
          </MetadataRow>
        )}
        {rules.length > 0 && <MetadataRow label={`${prefix}规则`}>{rules.join(' · ')}</MetadataRow>}
        {schema.format === 'binary' && (
          <MetadataRow label={`${prefix}格式`}>
            <code>binary</code> · 以二进制文件传递
          </MetadataRow>
        )}
        {(parameter?.style !== undefined || parameter?.explode !== undefined) && (
          <MetadataRow label={`${prefix}序列化`}>
            <code>{parameter.style || '默认方式'}</code>
            {parameter.explode !== undefined && ` · explode = ${parameter.explode}`}
          </MetadataRow>
        )}
        {field.encoding && (
          <MetadataRow label={`${prefix}编码`}>
            <code>{formatRequestValue(field.encoding)}</code>
          </MetadataRow>
        )}
        {otherMetadata.map(
          ([label, value]) =>
            value !== undefined && (
              <MetadataRow key={label} label={`${prefix}${label}`}>
                <code>{formatRequestValue(value)}</code>
              </MetadataRow>
            ),
        )}
      </dl>
      {itemMetadata}
    </>
  );
}

/**
 * Renders composition choices with the shared content-sized segmented control.
 *
 * @param props Composition metadata, owner path and current view actions.
 * @returns Themed polymorphic container with branch selector and global tooltip.
 */
function CompositionSwitch({
  composition,
  fieldKey,
  view,
}: {
  composition?: RequestComposition;
  fieldKey: string;
  view: RequestView;
}) {
  if (!composition || composition.options.length < 2) return null;
  const isOneOf = composition.keyword === 'oneOf';
  const isAnyOf = composition.keyword === 'anyOf';
  const bannerType = isOneOf ? 'oneof' : isAnyOf ? 'anyof' : 'allof';
  const tooltipText = isOneOf
    ? '互斥分支 仅匹配一种结构 · 切换预览'
    : isAnyOf
      ? '联合分支 满足其中任一或多个结构 · 切换预览'
      : `${composition.keyword} 分支切换预览`;

  return (
    <div className={`operation-request__banner operation-request__banner--${bannerType}`}>
      <Tooltip className="operation-request__banner-tag-anchor" content={tooltipText}>
        <button
          type="button"
          className={`operation-request__banner-tag operation-request__banner-tag--${bannerType}`}
          aria-label={`${composition.keyword}：${tooltipText}`}
        >
          {composition.keyword}
        </button>
      </Tooltip>
      <div className="operation-request__banner-branches">
        <SegmentedControl
          ariaLabel={`${fieldKey} 的结构分支`}
          autoWidth
          className="operation-request__branch-switch"
          value={String(composition.selected)}
          onChange={(value) => view.selectVariant(fieldKey, Number(value))}
          options={composition.options.map((option, index) => {
            const schema = resolveRequestSchema(option, view.schemas);
            const label =
              schema.title || schema.referenceName || getRequestTypeLabel(schema, view.schemas);
            return {
              label,
              title: schema.description || schema.referenceName || label,
              value: String(index),
            };
          })}
        />
      </div>
    </div>
  );
}

/**
 * Displays merged allOf fields in source groups with themed allOf banners.
 *
 * @param props Current field collection, schema provenance and request-view actions.
 * @returns Public/reference and branch groups, or a plain recursive field list.
 */
function RequestFieldList({
  fields,
  schema,
  view,
}: {
  fields: RequestField[];
  schema?: RequestDisplaySchema;
  view: RequestView;
}) {
  const visible = fields.filter(view.matches);
  if (!visible.length)
    return <p className="operation-request__empty">当前条件下没有可展示的字段</p>;
  if (!schema?.sources?.length || schema.sources.length === 1)
    return (
      <>
        {visible.map((field) => (
          <RequestFieldNode field={field} key={field.key} view={view} />
        ))}
      </>
    );
  const assigned = new Set<string>();
  const groups = schema.sources.map((source) => {
    const members = visible.filter(
      (field) => source.properties.includes(field.name) && !assigned.has(field.key),
    );
    members.forEach((field) => assigned.add(field.key));
    return { source, members };
  });
  return (
    <>
      {groups.map(
        ({ source, members }, index) =>
          members.length > 0 && (
            <div
              className={`operation-request__inheritance-group ${source.reference ? 'operation-request__inheritance-group--base' : ''}`}
              key={index}
            >
              <div className="operation-request__group-header">
                <span
                  className={`operation-request__group-badge ${source.reference ? 'operation-request__group-badge--base' : 'operation-request__group-badge--local'}`}
                >
                  {source.reference ? '继承基类' : '扩展属性'}
                </span>
                <span className="operation-request__group-title">
                  {source.reference ? source.label : schema.referenceName || source.label}
                </span>
                <span className="operation-request__group-count">({members.length} 个字段)</span>
              </div>
              <div className="operation-request__group-fields">
                {members.map((field) => (
                  <RequestFieldNode field={field} key={field.key} view={view} />
                ))}
              </div>
            </div>
          ),
      )}
      {visible
        .filter((field) => !assigned.has(field.key))
        .map((field) => (
          <RequestFieldNode field={field} key={field.key} view={view} />
        ))}
    </>
  );
}

/**
 * Renders a request field matching the demo 1:1 layout.
 *
 * @param props Request field and shared view actions.
 * @returns Field headline, metadata, branch selector and initially expanded nested structure.
 */
function RequestFieldNode({ field, view }: { field: RequestField; view: RequestView }) {
  const childrenId = useId();
  const expandable = hasRequestChildren(field);
  const open = !view.collapsed.has(field.key);
  const schema = field.schema;
  const isArray = getRequestType(schema) === 'array';
  const entity = isArray ? resolveRequestSchema(schema.items ?? {}, view.schemas) : schema;
  const entityDefinition = entity.referenceName
    ? view.schemas[entity.referenceName]
    : !isArray && field.composition
      ? field.composition.options[field.composition.selected]
      : entity;
  const entityDescription = expandable
    ? resolveRequestSchema(entityDefinition ?? {}, view.schemas).description?.trim()
    : undefined;
  const scope = isArray ? `${field.key}[]` : field.key;

  return (
    <div
      className={`operation-request__field${expandable ? ' is-structured' : ''}${open ? ' is-open' : ' is-collapsed'}`}
      data-path={field.key}
    >
      <div className="operation-request__record">
        <div className="operation-request__field-line">
          {expandable ? (
            <button
              aria-controls={childrenId}
              aria-expanded={open}
              aria-label={`${open ? '收起' : '展开'} ${field.name} 的子级字段`}
              className={`operation-request__disclosure${open ? ' expanded' : ''}`}
              onClick={() => view.toggle(field.key)}
              type="button"
            >
              <IconChevronRight aria-hidden="true" size={11} stroke={2.4} />
            </button>
          ) : (
            <span className="operation-request__bullet" aria-hidden="true">
              <span className="operation-request__bullet-dot" />
            </span>
          )}
          <div className="operation-request__field-main">
            <SchemaFieldHead
              name={field.name}
              schema={schema}
              schemas={view.schemas}
              required={field.required}
              onCopyName={() => view.copy(field.name, `${field.name} 已复制`)}
              description={
                field.description && (
                  <MarkdownContent
                    className="operation-request__field-description"
                    content={field.description}
                  />
                )
              }
            >
              {field.recursive && (
                <>
                  <span className="operation-request__recursive-label">递归节点</span>
                  <button
                    className="operation-request__recursive-path"
                    type="button"
                    title="复制完整字段路径"
                    onClick={() => view.copy(scope, '字段路径已复制')}
                  >
                    {scope}
                  </button>
                </>
              )}
            </SchemaFieldHead>
            <RequestMetadata field={field} copy={view.copy} />
          </div>
        </div>
      </div>

      {!expandable && field.composition && (
        <CompositionSwitch composition={field.composition} fieldKey={field.key} view={view} />
      )}
      {expandable && (
        <HeightTransition
          open={open}
          id={childrenId}
          className="rare-tree-collapse"
          contentClassName="operation-request__children"
          unmountOnExit
        >
          {field.composition && (
            <CompositionSwitch composition={field.composition} fieldKey={field.key} view={view} />
          )}
          {schema.unresolvedReference ? (
            <p className="operation-request__empty">无法解析引用：{schema.unresolvedReference}</p>
          ) : field.truncated ? (
            <p className="operation-request__empty">已到达请求结构的预览层级上限</p>
          ) : (
            <>
              {!field.recursive && (
                <div className="operation-request__child-context">
                  <code>{entity.referenceName || (isArray ? '数组元素' : '对象属性')}</code>
                  {(entity.referenceName || entityDescription) && (
                    <span>{entityDescription || (isArray ? '数组元素' : '实体字段')}</span>
                  )}
                  <button
                    onClick={() => view.copy(scope, '字段路径已复制')}
                    title="复制完整字段路径"
                    type="button"
                  >
                    {scope}
                  </button>
                </div>
              )}
              <RequestFieldList fields={field.children} schema={schema} view={view} />
            </>
          )}
        </HeightTransition>
      )}
    </div>
  );
}

/**
 * Displays complete request definitions without changing response rendering or debug behavior.
 *
 * @param props Active operation, schemas and the shared request Content-Type selection.
 * @returns Location cards, field metadata, composition controls and request-only filtering.
 */
export function RequestParameters({
  contentType,
  onContentTypeChange,
  operation,
  schemas,
  variants: selectedVariants,
  onVariantsChange,
}: RequestParametersProps) {
  const sectionId = useId();
  const [query, setQuery] = useState('');
  const [localVariants, setLocalVariants] = useState(new Map<string, number>());
  const variants = selectedVariants ?? localVariants;
  const setVariants = onVariantsChange ?? setLocalVariants;
  const previousOperation = useRef<typeof operation | undefined>(undefined);
  const previousContentType = useRef<string | undefined>(undefined);
  const [collapsed, setCollapsed] = useState(new Set<string>());
  const setCopied = useNotification();
  const contentTypes = getContentTypes(operation.requestBody?.content);
  const activeContentType = contentTypes.includes(contentType)
    ? contentType
    : getDefaultContentType(operation.requestBody?.content);

  useEffect(() => {
    setQuery('');
    if (previousOperation.current && previousOperation.current !== operation)
      setVariants(new Map());
    previousOperation.current = operation;
    setCollapsed(new Set());
  }, [operation, schemas, setVariants]);

  useEffect(() => {
    if (
      previousContentType.current !== undefined &&
      previousContentType.current !== activeContentType
    )
      setVariants(new Map());
    previousContentType.current = activeContentType;
    setCollapsed(new Set());
  }, [activeContentType, setVariants]);

  const groups = useMemo<RequestGroup[]>(() => {
    const context: RequestTreeContext = { ancestors: new Set(), schemas, variants };
    const result = parameterLocations.flatMap(({ location, title, label }) => {
      const parameters = (operation.parameters ?? []).filter(
        (parameter) => parameter.in === location,
      );
      if (!parameters.length) return [];
      return [
        {
          location,
          title,
          label,
          fields: parameters.map((parameter) =>
            createRequestField(
              parameter.name,
              parameter.schema ?? {},
              `${location}.${parameter.name}`,
              parameter.required ?? false,
              context,
              0,
              parameter,
            ),
          ),
        },
      ];
    }) as RequestGroup[];
    const definition = operation.requestBody?.content?.[activeContentType];
    if (!definition) return result;
    if (!definition.schema)
      return [...result, { location: 'body', title: '请求体', label: 'Body', fields: [] }];
    const prepared = prepareRequestSchema(definition.schema, 'body', context);
    const bodyContext = { ...context, ancestors: new Set(prepared.schema.references ?? []) };
    const objectFields =
      getRequestType(prepared.schema) === 'object' && prepared.schema.properties !== undefined;
    const fields = objectFields
      ? createRequestChildren(prepared.schema, 'body', bodyContext)
      : [
          createRequestField(
            '请求体',
            definition.schema,
            'body',
            operation.requestBody?.required ?? false,
            context,
          ),
        ];
    const encodedFields = fields.map((field) => ({
      ...field,
      encoding: definition.encoding?.[field.name],
    }));
    const rootValue =
      !objectFields &&
      getRequestType(prepared.schema) === 'array' &&
      !hasRequestChildren(encodedFields[0])
        ? encodedFields[0]
        : undefined;
    const omitted = Object.values(prepared.schema.properties ?? {}).filter((property) => {
      const resolved = resolveRequestSchema(property, schemas);
      return (
        resolved.readOnly || resolved.hidden || resolved.accessMode?.toUpperCase() === 'READ_ONLY'
      );
    }).length;
    return [
      ...result,
      {
        location: 'body',
        title: '请求体',
        label: 'Body',
        fields: encodedFields,
        schema: prepared.schema,
        composition: objectFields || rootValue ? prepared.composition : undefined,
        omitted,
        rootValue,
      },
    ];
  }, [activeContentType, operation, schemas, variants]);

  /**
   * Copies a complete original example or path, with a fallback for non-secure document hosts.
   *
   * @param value Value to copy without replacing it with generated example data.
   * @param label Success message displayed inside the request area.
   * @param onComplete Optional result callback for feedback beside an example instead of a page notice.
   * @returns Resolves after the copy attempt and updates a visible status notification.
   */
  const copy = async (value: unknown, label: string, onComplete?: (success: boolean) => void) => {
    const text = formatRequestValue(value);
    let success = false;
    try {
      await navigator.clipboard.writeText(text);
      success = true;
    } catch {
      const previousFocus = globalThis.document.activeElement;
      const textarea = globalThis.document.createElement('textarea');
      textarea.value = text;
      textarea.style.cssText = 'position:fixed;left:-9999px;top:0';
      globalThis.document.body.append(textarea);
      textarea.select();
      try {
        success = globalThis.document.execCommand('copy');
      } catch {
        success = false;
      } finally {
        textarea.remove();
        if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true });
      }
    }
    if (onComplete) {
      onComplete(success);
      return;
    }
    setCopied(success ? label : '复制失败，请手动选择内容复制');
  };

  /**
   * Matches request fields while retaining ancestors needed to reach matching child fields.
   *
   * @param field Current request-tree node.
   * @returns True when this node or any descendant satisfies the active filters.
   */
  const matches = (field: RequestField): boolean => {
    const search = query.trim().toLowerCase();
    const own =
      `${field.key} ${field.description || ''} ${getRequestTypeLabel(field.schema, schemas)}`
        .toLowerCase()
        .includes(search);
    return own || field.children.some(matches);
  };

  const view: RequestView = {
    collapsed,
    copy: (value, label, onComplete) => {
      void copy(value, label, onComplete);
    },
    matches,
    schemas,
    selectVariant: (key, index) => {
      setVariants((current) => new Map(current).set(key, index));
      setCollapsed((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    },
    toggle: (key) =>
      setCollapsed((current) => {
        const next = new Set(current);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      }),
  };

  if (groups.length === 0) return null;

  return (
    <MovingHighlight className="operation-request">
      <header className="operation-request__heading">
        <h2>请求参数</h2>
        {groups.length > 0 && (
          <div className="operation-request__navigation">
            <nav aria-label="参数位置">
              {groups.map((group) => (
                <button
                  key={group.location}
                  onClick={() =>
                    globalThis.document
                      .getElementById(`${sectionId}-${group.location}`)
                      ?.scrollIntoView({ block: 'start' })
                  }
                  type="button"
                >
                  {group.label}
                  {!group.rootValue && <span>{group.fields.length}</span>}
                </button>
              ))}
            </nav>
            <ParameterTypeScriptPreview
              key={`${operation.method}:${operation.path}:${activeContentType}`}
              title="请求参数"
              generate={() => createRequestTypes(operation, schemas, activeContentType)}
            />
            <label className="operation-request__search ui-input-shell">
              <IconSearch aria-hidden="true" size={13} stroke={1.8} />
              <Input
                variant="embedded"
                aria-label="查找请求字段或描述"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setCollapsed(new Set());
                }}
                placeholder="查找字段或描述"
                type="search"
                value={query}
              />
            </label>
          </div>
        )}
      </header>
      {groups.map((group) => (
        <section
          aria-label={group.title}
          className="operation-request__card"
          id={`${sectionId}-${group.location}`}
          key={group.location}
        >
          <header className="operation-request__card-heading">
            <div className="operation-request__section-identity">
              <h3>{group.title}</h3>
              <code>{group.label}</code>
              {!group.rootValue && <span>{group.fields.length}</span>}
            </div>
            {group.schema &&
              (!group.rootValue || group.schema.referenceName || group.schema.description) && (
                <div className="operation-request__model">
                  {(!group.rootValue || group.schema.referenceName) && (
                    <code>{group.schema.referenceName || getRequestType(group.schema)}</code>
                  )}
                  {group.schema.description && <span>{group.schema.description}</span>}
                </div>
              )}
            {group.location === 'body' && (
              <>
                {contentTypes.length > 1 ? (
                  <SelectMenu
                    ariaLabel="请求体 Content-Type"
                    className="operation-request__media"
                    onChange={onContentTypeChange}
                    options={contentTypes.map((value) => ({ label: value, value }))}
                    value={activeContentType}
                  />
                ) : (
                  <code className="operation-request__media-text">{activeContentType}</code>
                )}
                <span
                  className={
                    operation.requestBody?.required
                      ? 'operation-request__required'
                      : 'operation-request__optional'
                  }
                >
                  {operation.requestBody?.required ? '必填' : '可选'}
                </span>
              </>
            )}
          </header>
          {group.location === 'body' &&
            operation.requestBody?.description &&
            operation.requestBody.description !== group.schema?.description && (
              <MarkdownContent
                className="operation-request__body-description"
                content={operation.requestBody.description}
              />
            )}
          <CompositionSwitch composition={group.composition} fieldKey="body" view={view} />
          <div className="operation-request__root">
            {group.location === 'body' && !group.schema ? (
              <p className="operation-request__empty">此媒体类型未声明字段结构</p>
            ) : group.rootValue ? (
              view.matches(group.rootValue) ? (
                <div className="operation-request__root-value">
                  <div className="operation-request__root-structure">
                    <span>结构</span>
                    <code>{getRequestTypeLabel(group.rootValue.schema, schemas)}</code>
                  </div>
                  <RequestMetadata field={group.rootValue} copy={view.copy} />
                </div>
              ) : (
                <p className="operation-request__empty">当前条件下没有可展示的字段</p>
              )
            ) : (
              <RequestFieldList fields={group.fields} schema={group.schema} view={view} />
            )}
          </div>
          {Boolean(group.omitted) && (
            <p className="operation-request__note">已省略 {group.omitted} 个只读或隐藏字段</p>
          )}
        </section>
      ))}
    </MovingHighlight>
  );
}

/**
 * Reuses request-field rendering for complete entity schemas without location cards or Body labels.
 * @param props Model schema, registry, search filter and shared composition selection.
 * @returns The same field heads, metadata, nested guides and branch controls used by request Body.
 */
export function ModelSchemaFields({
  schema,
  schemas,
  query,
  variants,
  onVariantsChange,
}: {
  schema: Schema;
  schemas: Record<string, Schema>;
  query: string;
  variants: Map<string, number>;
  onVariantsChange: Dispatch<SetStateAction<Map<string, number>>>;
}) {
  const [collapsed, setCollapsed] = useState(new Set<string>());
  const showNotice = useNotification();
  useEffect(() => {
    setCollapsed(new Set());
  }, [query]);
  const prepared = useMemo(() => {
    const context: RequestTreeContext = {
      schemas,
      variants,
      ancestors: new Set(),
      includeReadOnly: true,
    };
    const root = prepareRequestSchema(schema, 'body', context);
    const fields =
      getRequestType(root.schema) === 'object'
        ? createRequestChildren(root.schema, 'body', {
            ...context,
            ancestors: new Set(root.schema.references ?? []),
          })
        : [createRequestField('value', schema, 'body', false, context)];
    return { ...root, fields };
  }, [schema, schemas, variants]);

  /** Copies a field value or path and reports the result through the global notification center.
   * @param value Original field value to copy.
   * @param label Completion message.
   * @returns Resolves after clipboard or legacy copy completes.
   */
  const copy = async (value: unknown, label: string) => {
    const text = formatRequestValue(value);
    try {
      await navigator.clipboard.writeText(text);
      showNotice(label);
    } catch {
      const previous = document.activeElement;
      const input = document.createElement('textarea');
      input.value = text;
      input.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.append(input);
      input.select();
      try {
        showNotice(document.execCommand('copy') ? label : '复制失败，请手动复制');
      } catch {
        showNotice('复制失败，请手动复制');
      } finally {
        input.remove();
        if (previous instanceof HTMLElement) previous.focus({ preventScroll: true });
      }
    }
  };
  /** Retains ancestors when a nested field matches the active search.
   * @param field Current tree node.
   * @returns True when its name, description, type or any child matches.
   */
  const matches = (field: RequestField): boolean =>
    !query.trim() ||
    `${field.key} ${field.description ?? ''} ${getRequestTypeLabel(field.schema, schemas)}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()) ||
    field.children.some(matches);
  const view: RequestView = {
    collapsed,
    schemas,
    matches,
    copy: (value, label) => {
      void copy(value, label);
    },
    toggle: (key) =>
      setCollapsed((current) => {
        const next = new Set(current);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      }),
    selectVariant: (key, index) => {
      onVariantsChange((current) => new Map(current).set(key, index));
      setCollapsed((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    },
  };
  return (
    <MovingHighlight className="operation-request entity-model__fields">
      {prepared.composition && (
        <CompositionSwitch composition={prepared.composition} fieldKey="body" view={view} />
      )}
      <RequestFieldList fields={prepared.fields} schema={prepared.schema} view={view} />
    </MovingHighlight>
  );
}
