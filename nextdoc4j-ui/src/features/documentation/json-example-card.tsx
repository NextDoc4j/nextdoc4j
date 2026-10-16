import {
  useCallback,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';

import { SelectMenu } from '../../components/select-menu';
import { MarkdownContent } from './markdown-content';
import { JsonDescriptionToggle } from '../../components/json-description-toggle';
import { CodeEditor, type CodeEditorFieldMeta } from '../../components/code-editor';
import {
  createJsonExamplePreview,
  findJsonExampleNode,
  stringifyJsonExample,
} from './json-example-model';
import { getRequestType, getRequestTypeLabel, resolveRequestSchema } from './request-schema';
import { getSchemaEnumItems, isIntegerSchema } from '../openapi/schema';
import { getContentTypes, getDefaultContentType } from '../openapi/utils';
import type { MediaDefinition, OpenApiDocument } from '../../types/openapi';

interface JsonExampleCardProps {
  components: OpenApiDocument['components'];
  content: Record<string, MediaDefinition> | undefined;
  contentType: string;
  description?: string;
  direction: 'request' | 'response';
  exampleKey: string;
  heading?: ReactNode;
  onContentTypeChange: (value: string) => void;
  onExampleChange: (value: string) => void;
  onVariantsChange: Dispatch<SetStateAction<Map<string, number>>>;
  variants: Map<string, number>;
  unresolvedReference?: string;
}

/**
 * Displays one request or response JSON card with document-aware model and example selection.
 * @param props Active content, shared selection state, component registries and optional response heading.
 * @returns The approved compact card, or an explicit empty/non-JSON state without fabricated JSON.
 */
export function JsonExampleCard({
  components,
  content,
  contentType,
  description,
  direction,
  exampleKey,
  heading,
  onContentTypeChange,
  onExampleChange,
  onVariantsChange,
  variants,
  unresolvedReference,
}: JsonExampleCardProps) {
  const [showDescriptions, setShowDescriptions] = useState(true);
  const schemas = useMemo(() => components?.schemas ?? {}, [components?.schemas]);
  const contentTypes = getContentTypes(content);
  const mime = contentTypes.includes(contentType) ? contentType : getDefaultContentType(content);
  const definition = content?.[mime];
  const mediaName = mime.split(';')[0].trim().toLowerCase();
  const jsonContent = mediaName === '*/*' || /(?:\/|\+)json$/.test(mediaName);
  const preview = useMemo(
    () =>
      createJsonExamplePreview(
        jsonContent ? definition : undefined,
        { schemas, direction, variants },
        components,
        exampleKey,
      ),
    [jsonContent, definition, schemas, direction, variants, components, exampleKey],
  );
  const originalSchema = useMemo(
    () => resolveRequestSchema(definition?.schema ?? {}, schemas),
    [definition?.schema, schemas],
  );
  const choices = originalSchema.oneOf?.length
    ? originalSchema.oneOf
    : (originalSchema.anyOf ?? []);
  const selectedBranch = Math.max(0, Math.min(variants.get('body') ?? 0, choices.length - 1));
  const array = getRequestType(preview.schema) === 'array';
  const entity = array
    ? (preview.tree?.children[0]?.schema ??
      resolveRequestSchema(preview.schema.items ?? {}, schemas))
    : preview.schema;
  const modelLabel =
    preview.schema.referenceName ||
    preview.schema.title ||
    (array
      ? `array<${entity.referenceName || entity.title || getRequestTypeLabel(entity, schemas)}>`
      : '请求体');
  const modelDescription = preview.schema.description || entity.description || description;
  const message = unresolvedReference
    ? `未解析的响应引用：${unresolvedReference}`
    : !contentTypes.length
      ? '此响应未声明响应体'
      : !jsonContent
        ? `${mime} 内容不使用 JSON 预览`
        : preview.message;
  const tree = message ? undefined : preview.tree;
  const jsonText = useMemo(() => (tree ? stringifyJsonExample(tree.value) : ''), [tree]);

  const getFieldMeta = useCallback(
    (path: Array<string | number>): CodeEditorFieldMeta | undefined => {
      const node = findJsonExampleNode(tree, path);
      if (!node) return undefined;
      const schema = node.schema;
      const enums = getSchemaEnumItems(schema);
      const type = isIntegerSchema(schema)
        ? 'integer'
        : Array.isArray(schema.type)
          ? schema.type.join(' | ')
          : schema.type || (schema.properties ? 'object' : schema.items ? 'array' : undefined);
      return {
        type,
        description: schema.description?.trim() || schema.title?.trim(),
        enums: enums.length ? enums : undefined,
      };
    },
    [tree],
  );

  const getFieldDescription = useCallback(
    (path: Array<string | number>): string => {
      const node = findJsonExampleNode(tree, path);
      return node?.schema.description?.trim() || node?.schema.title?.trim() || '';
    },
    [tree],
  );

  const externalExample =
    preview.externalValue && /^https?:\/\//i.test(preview.externalValue)
      ? preview.externalValue
      : undefined;

  return (
    <section
      className={`operation-json__card operation-json__card--${direction}`}
      aria-label={direction === 'request' ? '请求 JSON 示例' : '响应 JSON 示例'}
    >
      <header className="operation-json__card-header">
        <div className="operation-json__heading">
          <div className="operation-json__heading-main">
            {direction === 'request' ? (
              choices.length > 1 && preview.provenance === '结构示例' ? (
                <SelectMenu
                  ariaLabel="选择请求示例模型"
                  className="operation-json__model-picker"
                  value={String(selectedBranch)}
                  onChange={(value) =>
                    onVariantsChange((current) => new Map(current).set('body', Number(value)))
                  }
                  options={choices.map((choice, index) => {
                    const schema = resolveRequestSchema(choice, schemas);
                    return {
                      value: String(index),
                      label: schema.referenceName || schema.title || `结构 ${index + 1}`,
                    };
                  })}
                />
              ) : (
                <code>{modelLabel}</code>
              )
            ) : (
              heading
            )}
            {tree && (
              <span
                className={`operation-json__provenance-tag operation-json__provenance-tag--${preview.provenance === '文档示例' ? 'doc' : 'schema'}`}
                title={
                  preview.provenance === '文档示例'
                    ? '后端文档中声明的示例数据'
                    : '根据 Schema 结构自动生成的示例'
                }
              >
                {preview.provenance}
              </span>
            )}
          </div>
          {(direction === 'request' ? modelDescription : description) && (
            <MarkdownContent
              className="operation-json__heading-description"
              content={direction === 'request' ? modelDescription : description}
            />
          )}
        </div>
        {tree && (
          <JsonDescriptionToggle visible={showDescriptions} onChange={setShowDescriptions} />
        )}
      </header>
      {preview.options.length > 1 && definition?.example === undefined && (
        <div className="operation-json__example-picker">
          <span>示例</span>
          <SelectMenu
            ariaLabel={direction === 'request' ? '选择请求 JSON 示例' : '选择响应 JSON 示例'}
            value={preview.selectedExample}
            onChange={onExampleChange}
            options={preview.options.map((option) => ({ value: option.key, label: option.label }))}
          />
        </div>
      )}
      <div className="operation-json__body">
        <div className="operation-json__body-content">
          {tree ? (
            <CodeEditor
              readOnly
              language="json"
              value={jsonText}
              showAnnotations={showDescriptions}
              hoverTooltip={false}
              truncateLongStrings={true}
              getFieldMeta={getFieldMeta}
              getFieldDescription={getFieldDescription}
            />
          ) : (
            <div className="operation-json__empty">
              <strong>{message || '暂无 JSON 内容'}</strong>
              {externalExample && (
                <a href={externalExample} target="_blank" rel="noreferrer">
                  查看外部示例
                </a>
              )}
            </div>
          )}
        </div>
      </div>
      {contentTypes.length > 1 && (
        <div className="operation-json__source">
          <SelectMenu
            className="operation-json__media-picker"
            ariaLabel={direction === 'request' ? '请求示例内容格式' : '响应示例内容格式'}
            value={mime}
            onChange={onContentTypeChange}
            options={contentTypes.map((value) => ({ value, label: value }))}
          />
        </div>
      )}
    </section>
  );
}
