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
import { MarkdownContent } from './markdown-content';
import { ParameterTypeScriptPreview } from './parameter-typescript-preview';
import { createResponseTypes } from './parameter-typescript';
import { SchemaFieldHead, SchemaMetadataRow as MetaRow } from './schema-field-presentation';
import {
  formatRequestValue,
  getRequestRanges,
  getRequestType,
  getRequestTypeLabel,
  prepareRequestSchema as prepare,
  resolveRequestSchema,
  type RequestComposition,
  type RequestDisplaySchema,
} from './request-schema';
import {
  getResponseExample,
  getResponseExampleProperty,
  isResponseFieldVisible as visible,
  matchesResponseSchema as matches,
  resolveResponseReference,
  type ResponseSchemaContext,
} from './response-schema';
import { formatSchemaValue, getSchemaEnumItems, hasSchemaDefaultValue } from '../openapi/schema';
import { getContentTypes, getDefaultContentType } from '../openapi/utils';
import type {
  ApiOperation,
  OpenApiDocument,
  ResponseDefinition,
  Schema,
} from '../../types/openapi';

interface ResponseParametersProps {
  components: OpenApiDocument['components'];
  operation: ApiOperation;
  responseCode?: string;
  onResponseCodeChange?: (value: string) => void;
  contentType?: string;
  onContentTypeChange?: (value: string) => void;
  variants?: Map<string, number>;
  onVariantsChange?: Dispatch<SetStateAction<Map<string, number>>>;
  exampleKey?: string;
}

interface View extends ResponseSchemaContext {
  collapsed: Set<string>;
  recursiveReferences?: Set<string>;
  select: (key: string, value: number) => void;
  toggle: (key: string) => void;
}

const responseStatusNames: Record<string, string> = {
  '200': 'OK',
  '201': 'Created',
  '202': 'Accepted',
  '204': 'No Content',
  '301': 'Moved Permanently',
  '302': 'Found',
  '304': 'Not Modified',
  '400': 'Bad Request',
  '401': 'Unauthorized',
  '403': 'Forbidden',
  '404': 'Not Found',
  '405': 'Method Not Allowed',
  '406': 'Not Acceptable',
  '409': 'Conflict',
  '415': 'Unsupported Media Type',
  '422': 'Unprocessable Content',
  '423': 'Locked',
  '429': 'Too Many Requests',
  '500': 'Internal Server Error',
  '502': 'Bad Gateway',
  '503': 'Service Unavailable',
  '504': 'Gateway Timeout',
  default: '其他响应',
};

/** 将内容复制到剪贴板，并兼容非安全上下文的文档服务。
 * @param value 完整复制文本。
 * @returns 复制是否成功。
 */
async function copy(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const previousFocus = document.activeElement;
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.append(textarea);
    textarea.select();
    try {
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      textarea.remove();
      if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true });
    }
  }
}

/** 提供值复制与全局通知反馈。
 * @param props 待复制值、自定义文案和样式。
 * @returns 点击后在右上角显示统一通知的复制控件。
 */
function CopyValue({
  value,
  children,
  className = 'operation-request__example',
}: {
  value: unknown;
  children?: ReactNode;
  className?: string;
}) {
  const setResult = useNotification();
  return (
    <span className="operation-request__example-anchor">
      <button
        type="button"
        className={className}
        title="点击复制示例值"
        onClick={async () => {
          setResult(
            (await copy(typeof value === 'string' ? value : formatRequestValue(value)))
              ? '示例值已复制'
              : '复制失败，请手动复制',
          );
        }}
      >
        {children || <code>{value === '' ? '""' : formatSchemaValue(value)}</code>}
      </button>
    </span>
  );
}

/** 显示响应字段的示例与声明约束。
 * @param props 字段结构、当前文档示例值与可选前缀。
 * @returns 默认展开的元数据，空默认值不占位。
 */
function Metadata({
  schema,
  value,
  prefix = '',
}: {
  schema: Schema;
  value?: unknown;
  prefix?: string;
}) {
  const examples =
    value !== undefined
      ? [value]
      : schema.example !== undefined
        ? [schema.example]
        : schema.examples || [];
  const enums = getSchemaEnumItems(schema),
    ranges = getRequestRanges(schema);
  const rules = [
    schema.nullable || schema.types?.includes('null') ? '可空' : '',
    schema.uniqueItems ? '元素唯一' : '',
    schema.deprecated ? '已弃用' : '',
  ].filter(Boolean);
  const rows: ReactNode[] = [];
  if (examples.length)
    rows.push(
      <MetaRow key="example" label={`${prefix}示例`}>
        <div className="operation-request__examples">
          {examples.map((item, index) => (
            <CopyValue key={index} value={item} />
          ))}
        </div>
      </MetaRow>,
    );
  if (ranges.length)
    rows.push(
      <MetaRow key="range" label={`${prefix}范围`}>
        <span className="operation-request__metadata-range">{ranges.join(' · ')}</span>
      </MetaRow>,
    );
  if (enums.length)
    rows.push(
      <MetaRow key="enum" label={`${prefix}枚举`}>
        <div className="operation-request__enums">
          {enums.map((item, index) => (
            <span key={index}>
              <code>{formatRequestValue(item.value)}</code>
              {item.description && <small>- {item.description}</small>}
            </span>
          ))}
        </div>
      </MetaRow>,
    );
  if (hasSchemaDefaultValue(schema.default))
    rows.push(
      <MetaRow key="default" label={`${prefix}默认值`}>
        <code>{formatSchemaValue(schema.default)}</code>
      </MetaRow>,
    );
  if (schema.pattern)
    rows.push(
      <MetaRow key="pattern" label={`${prefix}正则`}>
        <code>{schema.pattern}</code>
      </MetaRow>,
    );
  if (schema.const !== undefined)
    rows.push(
      <MetaRow key="const" label={`${prefix}固定值`}>
        <code>{formatSchemaValue(schema.const)}</code>
      </MetaRow>,
    );
  if (rules.length)
    rows.push(
      <MetaRow key="rules" label={`${prefix}规则`}>
        {rules.join(' · ')}
      </MetaRow>,
    );
  const metadata = [
    [
      '包含元素',
      schema.contains && (Object.keys(schema.contains).length ? schema.contains : '任意类型'),
    ],
    [
      '其余元素',
      schema.unevaluatedItems === false
        ? '不允许额外元素'
        : typeof schema.unevaluatedItems === 'object' && Object.keys(schema.unevaluatedItems).length
          ? schema.unevaluatedItems
          : undefined,
    ],
    ['类型标识', schema.discriminator?.propertyName],
    ['类型映射', schema.discriminator?.mapping],
    ['contentEncoding', schema.contentEncoding],
    ['contentMediaType', schema.contentMediaType],
  ] as const;
  metadata.forEach(([label, item]) => {
    if (item !== undefined)
      rows.push(
        <MetaRow key={label} label={`${prefix}${label}`}>
          <code>{formatRequestValue(item)}</code>
        </MetaRow>,
      );
  });
  return rows.length ? <dl className="operation-request__metadata">{rows}</dl> : null;
}

/** 复用项目的分段滑块展示组合分支。
 * @param props 组合结构、字段路径及切换回调。
 * @returns 可切换 oneOf 或 anyOf 的分支控件。
 */
function Variants({
  composition,
  path,
  view,
}: {
  composition?: RequestComposition;
  path: string;
  view: View;
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
          ariaLabel={`${path} 的结构分支`}
          autoWidth
          className="operation-request__branch-switch"
          value={String(composition.selected)}
          onChange={(value) => view.select(path, Number(value))}
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

/** 列出实体的响应字段，并保留组合结构的来源分组。
 * @param props 已解析模型、字段路径、祖先引用、当前示例及交互状态。
 * @returns 默认展示全部信息的字段序列。
 */
function Fields({
  schema,
  path,
  ancestors,
  depth,
  view,
  value,
}: {
  schema: RequestDisplaySchema;
  path: string;
  ancestors: Set<string>;
  depth: number;
  view: View;
  value?: unknown;
}) {
  const entries = Object.entries(schema.properties || {}).filter(
    ([name, raw]) => visible(raw, view.schemas) && matches(raw, `${path}.${name}`, view),
  );
  /** 将属性声明转换为带路径和示例的字段。
   * @param entry 字段名与原始模型组成的条目。
   * @returns 当前对象中的响应字段节点。
   */
  const node = ([name, raw]: [string, Schema]) => (
    <Field
      key={name}
      name={name}
      raw={raw}
      path={`${path}.${name}`}
      ancestors={ancestors}
      depth={depth}
      view={view}
      required={Boolean(schema.required?.includes(name))}
      value={getResponseExampleProperty(value, name)}
    />
  );
  let content: ReactNode = entries.map(node);
  if ((schema.sources?.length || 0) > 1) {
    const assigned = new Set<string>();
    content = (
      <>
        {schema.sources!.map((source, index) => {
          const members = entries.filter(
            ([name]) => source.properties.includes(name) && !assigned.has(name),
          );
          members.forEach(([name]) => assigned.add(name));
          return (
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
                  <span className="operation-request__group-title">{source.label}</span>
                  <span className="operation-request__group-count">({members.length} 个字段)</span>
                </div>
                <div className="operation-request__group-fields">{members.map(node)}</div>
              </div>
            )
          );
        })}
        {entries.filter(([name]) => !assigned.has(name)).map(node)}
      </>
    );
  }
  return (
    <>
      {content}
      {schema.prefixItems?.map(
        (raw, index) =>
          visible(raw, view.schemas) &&
          matches(raw, `${path}[${index}]`, view) && (
            <Field
              key={index}
              name={`[${index}]`}
              raw={raw}
              path={`${path}[${index}]`}
              ancestors={ancestors}
              depth={depth}
              view={view}
              value={getResponseExampleProperty(value, index)}
            />
          ),
      )}
      {schema.additionalProperties &&
        visible(
          typeof schema.additionalProperties === 'object' ? schema.additionalProperties : {},
          view.schemas,
        ) &&
        matches(
          typeof schema.additionalProperties === 'object' ? schema.additionalProperties : {},
          `${path}.{key}`,
          view,
        ) && (
          <Field
            name="{key}"
            raw={typeof schema.additionalProperties === 'object' ? schema.additionalProperties : {}}
            path={`${path}.{key}`}
            ancestors={ancestors}
            depth={depth}
            view={view}
          />
        )}
    </>
  );
}

/** 展示一个响应字段及其实体子级。
 * @param props 字段定义、路径、示例、递归上下文和交互状态。
 * @returns 紧凑字段信息；仅有子结构时提供展开收起。
 */
function Field({
  name,
  raw,
  path,
  ancestors,
  depth,
  view,
  required = false,
  value,
}: {
  name: string;
  raw: Schema;
  path: string;
  ancestors: Set<string>;
  depth: number;
  view: View;
  required?: boolean;
  value?: unknown;
}) {
  const childrenId = useId();
  const { schema, composition } = prepare(raw, path, view);
  const isArray = getRequestType(schema) === 'array';
  const childPath = isArray ? `${path}[]` : path;
  const item = isArray && schema.items ? prepare(schema.items, childPath, view) : undefined;
  const entity = item?.schema || schema;
  const entityComposition = item?.composition;
  const scalarItem =
    isArray &&
    !entityComposition &&
    !entity.properties &&
    !entity.items &&
    !entity.additionalProperties &&
    !entity.unresolvedReference &&
    !['object', 'array'].includes(getRequestType(entity)) &&
    !schema.prefixItems?.length;
  const refs = [...(schema.references || []), ...(item?.schema.references || [])];
  const repeatedReference = refs.find((ref) => ancestors.has(ref));
  const cycle = repeatedReference && Boolean(view.recursiveReferences?.size);
  const recursive = Boolean(repeatedReference && !cycle);
  const structured =
    !cycle &&
    !scalarItem &&
    Boolean(
      entity.properties ||
      entity.items ||
      entity.additionalProperties ||
      entityComposition ||
      schema.prefixItems?.length ||
      cycle ||
      schema.unresolvedReference ||
      entity.unresolvedReference,
    );
  const open = Boolean(view.query.trim()) || !view.collapsed.has(path);
  const next = new Set([...ancestors, ...refs]);
  const definition = entity.referenceName ? view.schemas[entity.referenceName] : entity;
  const description = resolveRequestSchema(definition || {}, view.schemas).description?.trim();
  const modelName = structured ? entity.referenceName || entity.title : undefined;
  const fieldDescription = schema.description?.trim();
  const filteredView =
    view.query.trim() &&
    [name, schema.description, modelName, description].some((text) =>
      text?.toLowerCase().includes(view.query.trim().toLowerCase()),
    )
      ? { ...view, query: '' }
      : view;
  const childView = {
    ...filteredView,
    recursiveReferences: new Set([
      ...(view.recursiveReferences ?? []),
      ...(repeatedReference ? [repeatedReference] : []),
    ]),
  };
  const setResult = useNotification();

  return (
    <div
      className={`operation-request__field${structured ? ' is-structured' : ''}${open ? ' is-open' : ' is-collapsed'}`}
      data-path={path}
    >
      <div className="operation-request__record">
        <div className="operation-request__field-line">
          {structured ? (
            <button
              type="button"
              className={`operation-request__disclosure${open ? ' expanded' : ''}`}
              aria-controls={childrenId}
              aria-expanded={open}
              aria-label={`${open ? '收起' : '展开'} ${name} 的子级`}
              onClick={() => view.toggle(path)}
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
              name={name}
              schema={schema}
              schemas={view.schemas}
              required={required}
              requiredLabel="必返"
              onCopyName={async () => {
                setResult((await copy(name)) ? `${name} 已复制` : '复制失败，请手动复制');
              }}
              description={
                (fieldDescription || (structured && description)) && (
                  <div className="operation-request__field-description operation-response__field-descriptions">
                    {fieldDescription && <MarkdownContent content={fieldDescription} />}
                    {structured && description && description !== fieldDescription && (
                      <MarkdownContent
                        className={fieldDescription ? 'operation-response__entity-description' : ''}
                        content={description}
                      />
                    )}
                  </div>
                )
              }
            >
              {recursive && (
                <>
                  <span className="operation-request__recursive-label">递归节点</span>
                  <button
                    className="operation-request__recursive-path"
                    type="button"
                    title="复制完整字段路径"
                    onClick={async () =>
                      setResult((await copy(childPath)) ? '字段路径已复制' : '复制失败，请手动复制')
                    }
                  >
                    {childPath}
                  </button>
                </>
              )}
              {(schema.readOnly || schema.accessMode?.toUpperCase() === 'READ_ONLY') && (
                <span className="operation-response__readonly">只读</span>
              )}
            </SchemaFieldHead>
            <Metadata schema={schema} value={structured ? undefined : value} />
            {scalarItem && (
              <>
                {entity.description && entity.description !== schema.description && (
                  <dl className="operation-request__metadata">
                    <MetaRow label="元素说明">
                      <MarkdownContent
                        className="operation-request__field-description"
                        content={entity.description}
                      />
                    </MetaRow>
                  </dl>
                )}
                <Metadata schema={entity} prefix="元素" />
              </>
            )}
          </div>
        </div>
      </div>
      {!structured && (
        <>
          <Variants composition={composition} path={path} view={view} />
          <Variants
            composition={entity.items ? undefined : entityComposition}
            path={childPath}
            view={view}
          />
        </>
      )}
      {structured && (
        <HeightTransition
          open={open}
          id={childrenId}
          className="rare-tree-collapse"
          contentClassName="operation-request__children"
          unmountOnExit
        >
          <Variants composition={composition} path={path} view={view} />
          <Variants
            composition={entity.items ? undefined : entityComposition}
            path={childPath}
            view={view}
          />
          {depth >= 10 ? (
            <p className="operation-request__empty">已到达响应结构的预览层级上限</p>
          ) : schema.unresolvedReference || entity.unresolvedReference ? (
            <p className="operation-request__empty">
              未解析的引用：{schema.unresolvedReference || entity.unresolvedReference}
            </p>
          ) : (
            <>
              {entity.items ? (
                <Field
                  name="[]"
                  raw={schema.items ?? entity}
                  path={childPath}
                  ancestors={new Set([...ancestors, ...(schema.references ?? [])])}
                  depth={depth + 1}
                  view={childView}
                  value={getResponseExampleProperty(value, 0)}
                />
              ) : (
                <Fields
                  schema={entity}
                  path={childPath}
                  ancestors={next}
                  depth={depth + 1}
                  view={childView}
                  value={isArray ? getResponseExampleProperty(value, 0) : value}
                />
              )}
            </>
          )}
        </HeightTransition>
      )}
    </div>
  );
}

/** 将状态与响应说明并入卡片标题行。
 * @param props 当前响应码与文档中的响应说明。
 * @returns 状态标识及支持 Markdown 的说明，不产生额外标题条。
 */
function ResponseSummary({ code, description }: { code: string; description?: string }) {
  const codeLabel = code === 'default' ? '其他响应' : responseStatusNames[code] || '';
  return (
    <>
      <div className="operation-response__current">
        <span className={`operation-response__status-dot tone-${code[0]}`} />
        <code>{code}</code>
        <span>{codeLabel}</span>
      </div>
      <MarkdownContent
        content={
          description && description !== codeLabel
            ? description
            : code.startsWith('2')
              ? '请求成功'
              : codeLabel || '未提供响应说明'
        }
        className="operation-response__description"
      />
    </>
  );
}

/**
 * Renders the active response body or headers with a shared, compact card heading.
 *
 * @param props Resolved response, active region, query, component registries and media-change callback.
 * @returns A field card with inline status metadata and no additional JSON example panel.
 */
function ResponseCard({
  response,
  code,
  query,
  tab,
  components,
  schemas,
  onMediaChange,
  contentType: selectedContentType,
  onContentTypeChange,
  variants: selectedVariants,
  onVariantsChange,
  exampleKey,
}: {
  response: ResponseDefinition & { unresolvedReference?: string };
  code: string;
  query: string;
  tab: 'body' | 'headers';
  components: OpenApiDocument['components'];
  schemas: Record<string, Schema>;
  onMediaChange: () => void;
  contentType?: string;
  onContentTypeChange?: (value: string) => void;
  variants?: Map<string, number>;
  onVariantsChange?: Dispatch<SetStateAction<Map<string, number>>>;
  exampleKey?: string;
}) {
  const [contentType, setContentType] = useState(() => getDefaultContentType(response.content));
  const [localVariants, setLocalVariants] = useState(new Map<string, number>());
  const variants = selectedVariants ?? localVariants;
  const setVariants = onVariantsChange ?? setLocalVariants;
  const [collapsed, setCollapsed] = useState(new Set<string>());
  const contentTypes = getContentTypes(response.content);
  const preferredContentType = selectedContentType ?? contentType;
  const mime = contentTypes.includes(preferredContentType)
    ? preferredContentType
    : getDefaultContentType(response.content);
  const previousResponse = useRef(response);
  const previousMime = useRef(mime);

  useEffect(() => {
    setContentType(getDefaultContentType(response.content));
  }, [response]);

  useEffect(() => {
    if (previousResponse.current !== response || previousMime.current !== mime)
      setVariants(new Map());
    previousResponse.current = response;
    previousMime.current = mime;
    setCollapsed(new Set());
  }, [mime, response, schemas, setVariants]);

  const view: View = {
    schemas,
    variants,
    collapsed,
    query,
    select: (key, index) => {
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
  const definition = response.content?.[mime];
  const { schema, composition } = prepare(definition?.schema ?? {}, 'body', view);
  const mediaExample = getResponseExample(definition, components, exampleKey);
  const declaredValue =
    mediaExample !== undefined
      ? mediaExample
      : schema.example !== undefined
        ? schema.example
        : schema.examples?.[0];
  const headers = useMemo(
    () =>
      Object.entries(response.headers ?? {}).map(([name, raw]) => {
        const header = resolveResponseReference(raw, components);
        const media = header.content?.[getDefaultContentType(header.content)];
        const originalSchema = header.schema ?? media?.schema ?? {};
        const example = getResponseExample(header, components);
        const value = example !== undefined ? example : getResponseExample(media, components);
        return {
          name,
          required: header.required,
          unresolvedReference: header.unresolvedReference,
          schema: {
            ...originalSchema,
            description: header.description ?? originalSchema.description,
            deprecated: header.deprecated ?? originalSchema.deprecated,
            ...(value !== undefined ? { example: value } : {}),
          },
        };
      }),
    [response.headers, components],
  );
  const visibleHeaders = headers.filter(
    (header) =>
      visible(header.schema, schemas) && matches(header.schema, `headers.${header.name}`, view),
  );
  const hasBody = contentTypes.length > 0;
  const objectFields = Boolean(
    schema.properties || schema.additionalProperties || schema.prefixItems?.length,
  );
  const bodyMatches = matches(definition?.schema ?? {}, 'body', view);
  const bodyView =
    query.trim() &&
    [schema.referenceName, schema.title, schema.description].some((value) =>
      value?.toLowerCase().includes(query.trim().toLowerCase()),
    )
      ? { ...view, query: '' }
      : view;
  const fileResponse = /octet-stream|^image\/|^audio\/|^video\//i.test(mime);

  return (
    <section className="operation-request__card">
      <div className="operation-request__card-heading operation-response__card-heading">
        <div className="operation-request__section-identity">
          <h3>{tab === 'headers' ? '响应头' : '响应体'}</h3>
          <code>{tab === 'headers' ? 'Headers' : 'Body'}</code>
        </div>
        <ResponseSummary code={code} description={response.description} />
        {tab === 'body' && hasBody && (
          <>
            {(schema.referenceName || schema.title || schema.description) && (
              <div className="operation-request__model">
                <code>{schema.referenceName || schema.title}</code>
                {schema.description !== response.description && <span>{schema.description}</span>}
              </div>
            )}
            {contentTypes.length > 1 ? (
              <SelectMenu
                ariaLabel="响应内容格式"
                className="operation-request__media"
                value={mime}
                onChange={(value) => {
                  setContentType(value);
                  onContentTypeChange?.(value);
                  onMediaChange();
                }}
                options={contentTypes.map((value) => ({ label: value, value }))}
              />
            ) : (
              <code className="operation-request__media-text">{mime}</code>
            )}
          </>
        )}
      </div>
      {response.unresolvedReference ? (
        <p className="operation-request__empty">未解析的响应引用：{response.unresolvedReference}</p>
      ) : tab === 'headers' ? (
        <div className="operation-request__root">
          {visibleHeaders.length ? (
            visibleHeaders.map((header) =>
              header.unresolvedReference ? (
                <p className="operation-request__empty" key={header.name}>
                  {header.name}：未解析的响应头引用 {header.unresolvedReference}
                </p>
              ) : (
                <Field
                  key={header.name}
                  name={header.name}
                  raw={header.schema}
                  path={`headers.${header.name}`}
                  ancestors={new Set()}
                  depth={0}
                  view={view}
                  required={header.required}
                />
              ),
            )
          ) : (
            <p className="operation-request__empty">
              {query.trim() ? `未找到与“${query}”匹配的响应头` : '未声明响应头'}
            </p>
          )}
        </div>
      ) : !hasBody ? (
        <div className="operation-response__empty">
          <span aria-hidden="true">∅</span>
          <strong>此响应未声明响应体</strong>
          <p>{code === '204' ? '204 No Content，无响应内容。' : '文档仅提供状态码与响应说明。'}</p>
        </div>
      ) : !definition?.schema ? (
        <p className="operation-request__empty">文档未声明此格式的响应结构</p>
      ) : schema.unresolvedReference ? (
        <p className="operation-request__empty">未解析的模型引用：{schema.unresolvedReference}</p>
      ) : (
        <>
          <Variants composition={composition} path="body" view={view} />
          <div className="operation-request__root">
            {!bodyMatches ? (
              <p className="operation-request__empty">未找到与“{query}”匹配的字段</p>
            ) : objectFields ? (
              <Fields
                schema={schema}
                path="body"
                ancestors={new Set(schema.references ?? [])}
                depth={0}
                view={bodyView}
                value={declaredValue}
              />
            ) : schema.items ? (
              <Field
                name="[]"
                raw={schema}
                path="body"
                ancestors={new Set()}
                depth={0}
                view={view}
                value={declaredValue}
              />
            ) : (
              <div className="operation-request__root-value">
                <div className="operation-request__root-structure">
                  <code>
                    {getRequestTypeLabel(schema, schemas)}
                    {schema.format && schema.format !== 'binary' ? ` · ${schema.format}` : ''}
                  </code>
                  <span>
                    {fileResponse
                      ? '文件内容'
                      : mime === 'text/event-stream'
                        ? '事件流响应'
                        : schema.description || '响应内容'}
                  </span>
                </div>
                <Metadata schema={schema} value={declaredValue} />
                {declaredValue === undefined && fileResponse && (
                  <p className="operation-response__format-note">
                    响应以文件内容返回，文档未提供可预览的示例。
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

/**
 * Displays response definitions using the approved request-style field presentation.
 *
 * @param props Active operation and its document component registries.
 * @returns Body/header navigation beside the title, status/search controls on the right and one active response card.
 */
export function ResponseParameters({
  operation,
  components,
  responseCode,
  onResponseCodeChange,
  contentType,
  onContentTypeChange,
  variants,
  onVariantsChange,
  exampleKey,
}: ResponseParametersProps) {
  const schemas = useMemo(() => components?.schemas ?? {}, [components]);
  const responses = useMemo(
    () =>
      Object.entries(operation.responses ?? {}).map(
        ([code, response]) => [code, resolveResponseReference(response, components)] as const,
      ),
    [operation.responses, components],
  );
  const [selectedCode, setSelectedCode] = useState(responses[0]?.[0] ?? '');
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'body' | 'headers'>('body');
  const selected =
    responses.find(([code]) => code === (responseCode ?? selectedCode)) ?? responses[0];
  const code = selected?.[0] ?? '';
  const response = selected?.[1];
  const hasHeaders = Object.keys(response?.headers ?? {}).length > 0;
  const activeTab = hasHeaders ? tab : 'body';

  useEffect(() => {
    setQuery('');
    if (!hasHeaders) setTab('body');
  }, [code, contentType, hasHeaders]);

  useEffect(() => {
    setSelectedCode(Object.keys(operation.responses ?? {})[0] ?? '');
    setQuery('');
    setTab('body');
  }, [operation, components]);

  return (
    <MovingHighlight
      as="section"
      className="operation-request operation-response"
      aria-label="响应参数"
    >
      <div className="operation-response__toolbar">
        <div className="operation-response__title">
          <h2>响应参数</h2>
          {hasHeaders && (
            <nav className="operation-response__navigation" aria-label="响应内容区域">
              {(['body', 'headers'] as const).map((section) => (
                <button
                  key={section}
                  type="button"
                  className={activeTab === section ? 'is-active' : ''}
                  aria-pressed={activeTab === section}
                  onClick={() => {
                    setTab(section);
                    setQuery('');
                  }}
                >
                  {section === 'body' ? '响应体' : '响应头'}
                  <code>{section === 'body' ? 'Body' : 'Headers'}</code>
                </button>
              ))}
            </nav>
          )}
        </div>
        <div className="operation-response__actions">
          {responses.length > 1 ? (
            <SegmentedControl
              autoWidth
              ariaLabel="HTTP 响应状态码"
              className={`operation-response__statuses tone-${code[0]}`}
              value={code}
              onChange={(value) => {
                setSelectedCode(value);
                onResponseCodeChange?.(value);
                setQuery('');
                if (
                  !Object.keys(responses.find(([key]) => key === value)?.[1].headers ?? {}).length
                )
                  setTab('body');
              }}
              options={responses.map(([value, definition]) => ({
                value,
                label: value,
                title: [responseStatusNames[value], definition.description]
                  .filter(Boolean)
                  .join(' · '),
              }))}
            />
          ) : (
            <code
              className={`operation-response__single-status tone-${code[0]}`}
              title={response?.description}
            >
              {code || '未定义'}
            </code>
          )}
          {response && (
            <ParameterTypeScriptPreview
              key={`${operation.method}:${operation.path}`}
              title="全部响应参数"
              generate={() => createResponseTypes(operation, components)}
            />
          )}
          <label className="operation-request__search ui-input-shell">
            <IconSearch aria-hidden="true" size={13} stroke={1.8} />
            <Input
              variant="embedded"
              type="search"
              aria-label="查找响应字段或描述"
              placeholder="查找字段或描述"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
      </div>
      {response ? (
        <ResponseCard
          key={code}
          response={response}
          code={code}
          query={query}
          tab={activeTab}
          schemas={schemas}
          components={components}
          onMediaChange={() => setQuery('')}
          contentType={contentType}
          onContentTypeChange={onContentTypeChange}
          variants={variants}
          onVariantsChange={onVariantsChange}
          exampleKey={exampleKey}
        />
      ) : (
        <section className="operation-request__card">
          <p className="operation-request__empty">此接口暂未提供响应定义</p>
        </section>
      )}
    </MovingHighlight>
  );
}
