import { describeSchemaLimits } from './schema-diagnostics';
import { resolveSchema, schemaName, toPrettyJson } from '../openapi/utils';
import {
  formatSchemaValue,
  getSchemaType,
  getSchemaTypes,
  getSchemaEnumItems,
  type SchemaEnumItem,
} from '../openapi/schema';
import { createMarkdownHeadingId } from '../documentation/markdown-heading';
import { getSecurityMetadataDisplay } from '../security/metadata';
import type {
  ApiOperation,
  MediaDefinition,
  OpenApiDocument,
  Operation,
  Parameter,
  Schema,
  SecurityScheme,
} from '../../types/openapi';
import type { ExportDocumentModel, ExportOperationSection } from './types';
import { createSchemaMock } from './mock';

type ParameterLocation = NonNullable<ApiOperation['parameters']>[number]['in'];
type SchemaCompositionKind = 'allOf' | 'anyOf' | 'oneOf';

interface SchemaComposition {
  kind: SchemaCompositionKind;
  schema: Schema;
  variants: Schema[];
}

interface SchemaField {
  name: string;
  required: boolean;
  schema: Schema;
}

interface MediaExample {
  label: string;
  value: unknown;
}

interface ResponseEnvelope {
  dataSchema: Schema;
  fields: SchemaField[];
}

type ResponseDefinition = NonNullable<Operation['responses']>[string];
type OperationResponseClass = 'A' | 'B' | 'C';

interface ResponseClassStats {
  A: number;
  B: number;
  C: number;
  total: number;
}

const parameterLocations: Array<[ParameterLocation, string]> = [
  ['path', 'Path 路径参数'],
  ['query', 'Query 查询参数'],
  ['header', 'Header 请求头参数'],
  ['cookie', 'Cookie 参数'],
];

/**
 * Escapes content written inside a Markdown table cell.
 *
 * @param value Raw table cell content.
 * @returns Markdown-safe single-line cell content.
 */
const escapeTableCell = (value: string) => value.replaceAll('|', '\\|').replaceAll('\n', '<br>');

/**
 * Prevents embedded OpenAPI descriptions from introducing headings deeper than h4.
 *
 * @param value Markdown description supplied by an OpenAPI document.
 * @returns Description with h5 and deeper headings clamped to h4.
 */
const clampMarkdownHeadings = (value: string) => value.replaceAll(/^#{5,}\s+/gmu, '#### ');

/**
 * Resolves the concise type label displayed for an OpenAPI schema.
 *
 * @param schema Inline or referenced OpenAPI schema.
 * @returns Reference name, primitive type, composition name or object fallback.
 */
const getSchemaLabel = (schema?: Schema) =>
  schemaName(schema) ||
  getSchemaTypes(schema).join(' | ') ||
  (schema?.allOf ? 'allOf' : '') ||
  (schema?.oneOf ? 'oneOf' : '') ||
  (schema?.anyOf ? 'anyOf' : '') ||
  'object';

/**
 * Resolves the effective schema while following a local component reference.
 *
 * @param schema Inline or referenced schema.
 * @param schemas Component schema registry.
 * @returns Resolved component schema or the original inline schema.
 */
const getResolvedSchema = (schema: Schema | undefined, schemas: Record<string, Schema>) =>
  resolveSchema(schema, schemas) ?? schema;

/**
 * Detects the OpenAPI composition keyword controlling a schema.
 *
 * @param schema Inline or referenced schema to inspect.
 * @param schemas Component schema registry.
 * @param ancestors Array schemas already visited in this branch.
 * @returns Composition kind and branches, or undefined for a regular schema.
 */
const getSchemaComposition = (
  schema: Schema | undefined,
  schemas: Record<string, Schema>,
  ancestors = new Set<Schema>(),
): SchemaComposition | undefined => {
  const resolved = getResolvedSchema(schema, schemas);
  if (!resolved || ancestors.has(resolved)) return undefined;
  const next = new Set(ancestors).add(resolved);
  if ((getSchemaType(resolved) === 'array' || resolved.items) && resolved.items) {
    return getSchemaComposition(resolved.items, schemas, next);
  }
  if (resolved.oneOf?.length) return { kind: 'oneOf', schema: resolved, variants: resolved.oneOf };
  if (resolved.anyOf?.length) return { kind: 'anyOf', schema: resolved, variants: resolved.anyOf };
  if (resolved.allOf?.length) return { kind: 'allOf', schema: resolved, variants: resolved.allOf };
  return undefined;
};

/**
 * Describes how one named OpenAPI security scheme is sent by a client.
 *
 * @param key Security requirement key.
 * @param scheme Component security scheme referenced by the key.
 * @returns Concrete authentication instructions including location and value format.
 */
const describeSecurityScheme = (key: string, scheme?: SecurityScheme) => {
  if (!scheme) return `\`${key}\`：文档未提供对应的安全方案定义`;
  if (scheme.type === 'apiKey') {
    const location = scheme.in === 'query' ? 'Query' : scheme.in === 'cookie' ? 'Cookie' : 'Header';
    return `\`${key}\`：API Key，通过 ${location} 参数 \`${scheme.name || key}\` 传递${scheme.description ? `；${scheme.description}` : ''}`;
  }
  if (scheme.type === 'http') {
    const protocol = scheme.scheme?.toLowerCase();
    if (protocol === 'bearer') {
      return `\`${key}\`：HTTP Bearer，通过 Header \`Authorization: Bearer <token>\` 传递${scheme.bearerFormat ? `，Token 格式为 ${scheme.bearerFormat}` : ''}`;
    }
    if (protocol === 'basic') {
      return `\`${key}\`：HTTP Basic，通过 Header \`Authorization: Basic <base64(username:password)>\` 传递`;
    }
    return `\`${key}\`：HTTP ${scheme.scheme?.toUpperCase() || '认证'}，通过 Header \`Authorization\` 传递`;
  }
  if (scheme.type === 'oauth2')
    return `\`${key}\`：OAuth 2.0，按服务端声明的授权流程获取并携带令牌`;
  if (scheme.type === 'openIdConnect')
    return `\`${key}\`：OpenID Connect，按服务端声明完成身份认证`;
  return `\`${key}\`：${scheme.type} 认证`;
};

/**
 * Creates detailed authentication lines for one operation.
 *
 * @param operation Operation whose security may override document defaults.
 * @param document Export document containing security scheme definitions.
 * @returns Markdown list describing anonymous access or each OR/AND authentication alternative.
 */
const getOperationSecurityLines = (operation: Operation, document: OpenApiDocument) => {
  if (operation['x-nextdoc4j-security']?.ignore === true) {
    return ['- 公开接口：Sa-Token 明确标记为跳过校验'];
  }
  const requirements = operation.security ?? document.security ?? [];
  const schemes = document.components?.securitySchemes ?? {};
  const metadata = getSecurityMetadataDisplay(operation);
  const lines = requirements.length > 1 ? ['- 以下鉴权方案任选其一：'] : [];
  if (!requirements.length) {
    lines.push(metadata?.rules.length ? '- OpenAPI 未声明额外安全方案' : '- 无需鉴权');
  }
  requirements.forEach((requirement, index) => {
    const names = Object.keys(requirement);
    if (!names.length) {
      lines.push(`- ${requirements.length > 1 ? `方案 ${index + 1}：` : ''}允许匿名访问`);
      return;
    }
    const prefix = requirements.length > 1 ? `方案 ${index + 1}` : '认证方案';
    const connector = names.length > 1 ? '，需同时满足' : '';
    lines.push(
      `- ${prefix}${connector}：${names.map((name) => describeSecurityScheme(name, schemes[name])).join('；')}`,
    );
  });
  if (metadata && !metadata.ignored) {
    metadata.rules.forEach((rule) => {
      lines.push(`- Sa-Token ${rule.label}：${rule.values.join(` ${rule.connector} `)}`);
    });
  }
  return lines;
};

/**
 * Formats the document-level authentication summary shown in the overview table.
 *
 * @param document Export document containing default requirements and registered schemes.
 * @returns Concise list of required or available security scheme keys.
 */
const getDocumentSecurityLabel = (document: OpenApiDocument) => {
  const requiredNames = [
    ...new Set((document.security ?? []).flatMap((requirement) => Object.keys(requirement))),
  ];
  if (requiredNames.length) return requiredNames.join('、');
  const registeredNames = Object.keys(document.components?.securitySchemes ?? {});
  return registeredNames.length ? `${registeredNames.join('、')}（按接口声明）` : '无';
};

/**
 * Collects every explicit media example, falling back to a generated schema example.
 *
 * @param media Request or response media definition.
 * @param schemas Component schemas used when explicit examples are absent.
 * @returns Ordered named examples ready for code block rendering.
 */
const getMediaExamples = (
  media: MediaDefinition,
  schemas: Record<string, Schema>,
): MediaExample[] => {
  if (media.example !== undefined) {
    return [
      {
        label: '默认示例',
        value: createSchemaMock(media.schema, schemas, media.example),
      },
    ];
  }
  const examples = Object.entries(media.examples ?? {}).flatMap(([label, example]) =>
    example.value === undefined
      ? []
      : [{ label, value: createSchemaMock(media.schema, schemas, example.value) }],
  );
  if (examples.length) return examples;
  return media.schema
    ? [{ label: 'Schema 生成示例', value: createSchemaMock(media.schema, schemas) }]
    : [];
};

/**
 * Formats an example according to its media type.
 *
 * @param value Example value to serialize.
 * @param contentType OpenAPI media type owning the example.
 * @returns Code fence language and readable example content.
 */
const formatMediaExample = (value: unknown, contentType: string) => {
  if (contentType.toLowerCase().includes('json') || typeof value !== 'string') {
    return { content: toPrettyJson(value), language: 'json' };
  }
  if (contentType.toLowerCase().includes('xml')) return { content: value, language: 'xml' };
  return { content: value, language: 'text' };
};

/**
 * Collects merged top-level fields from a regular or allOf schema.
 *
 * @param schema Schema whose visible fields should be documented.
 * @param schemas Component schema registry.
 * @param ancestors Array schemas already visited in this branch.
 * @returns Deduplicated fields with required-state metadata.
 */
const getSchemaFields = (
  schema: Schema | undefined,
  schemas: Record<string, Schema>,
  ancestors = new Set<Schema>(),
): SchemaField[] => {
  const resolved = getResolvedSchema(schema, schemas);
  if (!resolved || ancestors.has(resolved)) return [];
  const next = new Set(ancestors).add(resolved);
  if ((getSchemaType(resolved) === 'array' || resolved.items) && resolved.items) {
    return getSchemaFields(resolved.items, schemas, next);
  }
  const fragments = [resolved, ...(resolved.allOf ?? [])].map(
    (fragment) => getResolvedSchema(fragment, schemas) ?? fragment,
  );
  const requiredNames = new Set(fragments.flatMap((fragment) => fragment.required ?? []));
  const fields = new Map<string, SchemaField>();
  fragments.forEach((fragment) => {
    Object.entries(fragment.properties ?? {}).forEach(([name, property]) => {
      fields.set(name, { name, required: requiredNames.has(name), schema: property });
    });
  });
  return [...fields.values()];
};

/**
 * Collects displayable enum members from a field schema and its composition branches.
 *
 * @param schema Inline or referenced field schema.
 * @param schemas Component schema registry.
 * @param seenReferences Component references already traversed to stop circular schemas.
 * @returns Ordered enum members with NextDoc4j descriptions retained when available.
 */
const getFieldEnumItems = (
  schema: Schema | undefined,
  schemas: Record<string, Schema>,
  seenReferences = new Set<string>(),
): SchemaEnumItem[] => {
  if (!schema) return [];
  const referenceName = schema.$ref ? schemaName(schema) : '';
  if (referenceName) {
    if (seenReferences.has(referenceName)) return [];
    const nextReferences = new Set(seenReferences);
    nextReferences.add(referenceName);
    const resolved = schemas[referenceName];
    if (!resolved) return getSchemaEnumItems(schema);
    const merged = { ...resolved, ...schema };
    delete merged.$ref;
    return getFieldEnumItems(merged, schemas, nextReferences);
  }
  const directItems = getSchemaEnumItems(schema);
  if (directItems.length) return directItems;
  return [...(schema.oneOf ?? []), ...(schema.anyOf ?? []), ...(schema.allOf ?? [])].flatMap(
    (variant) => getFieldEnumItems(variant, schemas, seenReferences),
  );
};

/**
 * Formats a field description with its enum values on separate lines in the same table cell.
 *
 * @param field Schema field whose description and enum metadata should be displayed.
 * @param schemas Component schema registry used to resolve referenced enum definitions.
 * @returns Markdown table-cell content retaining the original description before enum details.
 */
const getFieldDescriptionCell = (field: SchemaField, schemas: Record<string, Schema>) => {
  const description = field.schema.description?.trim();
  const enumItems = getFieldEnumItems(field.schema, schemas);
  if (!enumItems.length) return escapeTableCell(description || '-');
  const enumLines = enumItems.map((item) => {
    const value = escapeTableCell(formatSchemaValue(item.value));
    const enumDescription = item.description?.trim();
    return enumDescription ? `${value} - ${escapeTableCell(enumDescription)}` : value;
  });
  return [description ? escapeTableCell(description) : '', '**枚举值：**', ...enumLines]
    .filter(Boolean)
    .join('<br>');
};

/**
 * Appends a field table for one schema.
 *
 * @param lines Mutable Markdown line collection.
 * @param title Table heading displayed above the fields.
 * @param schema Schema whose fields should be listed.
 * @param schemas Component schema registry.
 * @returns Nothing; appends content only when fields exist.
 */
const appendSchemaFields = (
  lines: string[],
  title: string,
  schema: Schema | undefined,
  schemas: Record<string, Schema>,
) => {
  const fields = getSchemaFields(schema, schemas);
  if (!fields.length) return;
  lines.push('', `**${title}**`, '', '| 字段 | 类型 | 必填 | 说明 |', '| --- | --- | --- | --- |');
  fields.forEach((field) => {
    lines.push(
      `| ${escapeTableCell(field.name)} | ${getSchemaLabel(field.schema)} | ${field.required ? '是' : '否'} | ${getFieldDescriptionCell(field, schemas)} |`,
    );
  });
};

/**
 * Appends one or more formatted media examples.
 *
 * @param lines Mutable Markdown line collection.
 * @param examples Named example values.
 * @param contentType OpenAPI media type controlling code formatting.
 * @param title Prefix used for each example label.
 * @returns Nothing; appends a fenced code block per example.
 */
const appendMediaExamples = (
  lines: string[],
  examples: MediaExample[],
  contentType: string,
  title: string,
) => {
  examples.forEach((example) => {
    const formatted = formatMediaExample(example.value, contentType);
    lines.push(
      '',
      `**${title} · ${example.label}**`,
      '',
      `\`\`\`${formatted.language}`,
      formatted.content,
      '```',
    );
  });
};

/**
 * Appends composition semantics, fields and examples for one media schema.
 *
 * @param lines Mutable Markdown line collection.
 * @param schema Request, response or entity schema.
 * @param schemas Component schema registry.
 * @param contentType Media type used to format examples.
 * @param examples Explicit or generated media examples.
 * @param contextLabel Human-readable request, response or entity label.
 * @returns Nothing; appends a complete composition-aware schema description.
 */
const appendSchemaDocumentation = (
  lines: string[],
  schema: Schema | undefined,
  schemas: Record<string, Schema>,
  contentType: string,
  examples: MediaExample[],
  contextLabel: string,
) => {
  const limits = describeSchemaLimits(schema, schemas);
  if (limits.length) lines.push('', ...limits.map((limit) => `> ${limit}`));

  if (!schema) {
    appendMediaExamples(lines, examples, contentType, `${contextLabel}示例`);
    return;
  }
  const resolved = getResolvedSchema(schema, schemas) ?? schema;
  const composition = getSchemaComposition(schema, schemas);
  lines.push('', `- 数据结构：\`${getSchemaLabel(schema)}\``);
  if (!composition) {
    appendSchemaFields(lines, `${contextLabel}字段`, resolved, schemas);
    appendMediaExamples(lines, examples, contentType, `${contextLabel}示例`);
    return;
  }

  const descriptions: Record<SchemaCompositionKind, string> = {
    allOf: '合并以下全部结构，字段与约束同时生效',
    anyOf: '可匹配以下一个或多个候选结构',
    oneOf: '必须且只能匹配以下一个候选结构',
  };
  lines.push('', `> Schema 组合：\`${composition.kind}\`，${descriptions[composition.kind]}。`);
  if (composition.schema.discriminator) {
    lines.push('', `- 判别字段：\`${composition.schema.discriminator.propertyName}\``);
    Object.entries(composition.schema.discriminator.mapping ?? {}).forEach(([value, reference]) => {
      lines.push(`  - \`${value}\` → \`${reference.split('/').at(-1) || reference}\``);
    });
  }

  if (composition.kind === 'allOf') {
    lines.push('');
    composition.variants.forEach((variant, index) => {
      lines.push(`${index + 1}. \`${getSchemaLabel(variant)}\``);
    });
    const fieldTitle =
      contextLabel === 'data 业务'
        ? `${contextLabel}字段（allOf 合并）`
        : `${contextLabel}合并字段`;
    const exampleTitle =
      contextLabel === 'data 业务'
        ? `${contextLabel}示例（allOf 合并）`
        : `${contextLabel}合并示例`;
    appendSchemaFields(lines, fieldTitle, resolved, schemas);
    appendMediaExamples(lines, examples, contentType, exampleTitle);
    return;
  }

  composition.variants.forEach((variant, index) => {
    const candidate = getResolvedSchema(variant, schemas) ?? variant;
    lines.push('', `**候选结构 ${index + 1}：\`${getSchemaLabel(variant)}\`**`);
    if (candidate.description?.trim())
      lines.push('', clampMarkdownHeadings(candidate.description.trim()));
    appendSchemaFields(lines, `候选结构 ${index + 1} 字段`, candidate, schemas);
    appendMediaExamples(
      lines,
      [{ label: `候选 ${index + 1}`, value: createSchemaMock(candidate, schemas) }],
      contentType,
      `${contextLabel}示例`,
    );
  });
  const explicitExamples = examples.filter((example) => example.label !== 'Schema 生成示例');
  if (explicitExamples.length) {
    appendMediaExamples(lines, explicitExamples, contentType, `${contextLabel}文档示例`);
  }
};

/**
 * Produces the concrete example used by parameter tables and curl generation.
 *
 * @param parameter OpenAPI Path, Query, Header or Cookie parameter.
 * @param schemas Component schema registry.
 * @returns Non-empty schema-compatible parameter value.
 */
const getParameterMock = (parameter: Parameter, schemas: Record<string, Schema>) =>
  createSchemaMock(parameter.schema, schemas, parameter.example, parameter.name);

/**
 * Formats one parameter mock for compact table and URL output.
 *
 * @param value Schema-compatible parameter mock value.
 * @returns Scalar text or compact JSON for structured values.
 */
const formatParameterMock = (value: unknown) =>
  value && typeof value === 'object' ? JSON.stringify(value) : String(value);

/**
 * Appends normal OpenAPI parameters grouped by their transport location.
 *
 * @param lines Mutable Markdown line collection.
 * @param operation Operation containing Path, Query, Header or Cookie parameters.
 * @param schemas Component schema registry used to resolve composed parameter types.
 * @returns Nothing; appends one clearly labelled table per parameter location.
 */
const appendOperationParameters = (
  lines: string[],
  operation: ApiOperation,
  schemas: Record<string, Schema>,
) => {
  parameterLocations.forEach(([location, label]) => {
    const parameters = (operation.parameters ?? []).filter(
      (parameter) => parameter.in === location,
    );
    if (!parameters.length) return;
    lines.push(
      '',
      `**${label}**`,
      '',
      '| 名称 | 类型 | 必填 | 示例 | 说明 |',
      '| --- | --- | --- | --- | --- |',
    );
    parameters.forEach((parameter) => {
      const composition = getSchemaComposition(parameter.schema, schemas);
      const typeLabel = `${getSchemaLabel(parameter.schema)}${composition ? ` (${composition.kind})` : ''}`;
      lines.push(
        `| ${escapeTableCell(parameter.name)} | ${typeLabel} | ${parameter.required ? '是' : '否'} | ${escapeTableCell(formatParameterMock(getParameterMock(parameter, schemas)))} | ${escapeTableCell(parameter.description || '-')} |`,
      );
    });
    parameters.forEach((parameter) => {
      const composition = getSchemaComposition(parameter.schema, schemas);
      if (!composition) return;
      const behavior =
        composition.kind === 'allOf'
          ? '合并全部结构'
          : composition.kind === 'oneOf'
            ? '仅匹配一个候选结构'
            : '匹配一个或多个候选结构';
      lines.push(
        '',
        `> 参数 \`${parameter.name}\` 使用 \`${composition.kind}\`（${behavior}）：${composition.variants
          .map((variant) => `\`${getSchemaLabel(variant)}\``)
          .join('、')}`,
      );
    });
  });
};

/**
 * Quotes a value for safe use as one POSIX shell argument.
 *
 * @param value Raw URL, Header or request body value.
 * @returns Single-quoted shell argument with embedded quotes escaped.
 */
const quoteShellArgument = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

/**
 * Checks whether an OpenAPI content key represents one concrete media type.
 *
 * @param contentType Content-Type value that may include parameters such as charset.
 * @param expectedMediaType Lowercase media type to compare against.
 * @returns True when the normalized media type matches exactly.
 */
const isMediaType = (contentType: string, expectedMediaType: string) =>
  contentType.split(';')[0]?.trim().toLowerCase() === expectedMediaType;

/**
 * Detects whether an operation exposes a Server-Sent Events response.
 *
 * @param operation Operation whose response content types should be inspected.
 * @returns True when any declared response uses text/event-stream.
 */
const producesEventStream = (operation: Operation) =>
  Object.values(operation.responses ?? {}).some((response) =>
    Object.keys(response.content ?? {}).some((contentType) =>
      isMediaType(contentType, 'text/event-stream'),
    ),
  );

/**
 * Detects whether a multipart string field represents one or more uploaded files.
 *
 * @param fieldName Multipart property name.
 * @param description Property description supplied by the OpenAPI document.
 * @returns True for common file field names and descriptions while excluding filename metadata.
 */
const hasMultipartFileHint = (fieldName: string, description = '') => {
  const normalizedName = fieldName.toLowerCase().replaceAll(/[^a-z0-9\u4e00-\u9fff]/gu, '');
  if (normalizedName.endsWith('filename') || description.includes('文件名')) return false;
  return (
    /(?:file|upload|attachment|avatar|image|photo|picture|icon|cover)$/u.test(normalizedName) ||
    /(?:文件|附件|头像|图片|照片|上传|二进制)/u.test(description)
  );
};

/**
 * Detects whether a multipart file field semantically contains multiple files.
 *
 * @param fieldName Multipart property name.
 * @param description Property description supplied by the OpenAPI document.
 * @returns True when plural naming or description text indicates a collection of files.
 */
const hasMultipleFileHint = (fieldName: string, description = '') =>
  /(?:files|attachments|images|photos|pictures)$/iu.test(fieldName) ||
  /(?:文件列表|多个文件|多文件|批量文件)/u.test(description);

/**
 * Classifies a multipart field as a single file, a file array or a regular form value.
 *
 * @param schema Multipart property schema.
 * @param schemas Component schema registry.
 * @param fieldName Multipart property name used when SpringDoc omits the binary format.
 * @param ancestors Schemas already visited in the current file/composition branch.
 * @returns Multipart field kind used to select curl's -F syntax.
 */
const getMultipartFieldKind = (
  schema: Schema | undefined,
  schemas: Record<string, Schema>,
  fieldName = '',
  ancestors = new Set<Schema>(),
): 'file' | 'file-array' | 'value' => {
  const resolved = getResolvedSchema(schema, schemas);
  if (!resolved || ancestors.has(resolved)) return 'value';
  const next = new Set(ancestors).add(resolved);
  const multipleFiles = hasMultipleFileHint(fieldName, resolved.description);
  if (resolved.format?.toLowerCase() === 'binary') {
    return multipleFiles ? 'file-array' : 'file';
  }
  if ((getSchemaType(resolved) === 'array' || resolved.items) && resolved.items) {
    const itemKind = getMultipartFieldKind(resolved.items, schemas, fieldName, next);
    if (itemKind === 'file' || itemKind === 'file-array') return 'file-array';
  }
  const stringType = getSchemaTypes(resolved).includes('string');
  if (stringType && hasMultipartFileHint(fieldName, resolved.description)) {
    return multipleFiles ? 'file-array' : 'file';
  }
  const composition = getSchemaComposition(schema, schemas);
  if (composition) {
    const kinds = composition.variants.map((variant) =>
      getMultipartFieldKind(variant, schemas, fieldName, next),
    );
    if (kinds.includes('file-array')) return 'file-array';
    if (kinds.includes('file')) return 'file';
  }
  return 'value';
};

/**
 * Creates stable file path examples for one multipart file field.
 *
 * @param fieldName Multipart property name used to choose a readable filename.
 * @param multiple Whether the field represents multiple uploaded files.
 * @param value Existing example value whose @-prefixed paths should be preserved.
 * @returns One path for a single file or at least two paths for a file collection.
 */
const getMultipartFilePaths = (fieldName: string, multiple: boolean, value: unknown) => {
  const existingValues = (Array.isArray(value) ? value : [value]).filter(
    (item): item is string => typeof item === 'string' && item.startsWith('@'),
  );
  const normalizedName = fieldName.toLowerCase();
  const imageField = /(?:avatar|image|photo|picture|icon|cover)/u.test(normalizedName);
  const pdfField = /(?:pdf|document)/u.test(normalizedName);
  const extension = imageField ? 'jpg' : pdfField ? 'pdf' : 'bin';
  if (!multiple) {
    const filename = imageField
      ? `${normalizedName.replaceAll(/[^a-z0-9_-]/gu, '-') || 'image'}.${extension}`
      : pdfField
        ? `${normalizedName.replaceAll(/[^a-z0-9_-]/gu, '-') || 'document'}.${extension}`
        : `example-file.${extension}`;
    return [existingValues[0] || `@./${filename}`];
  }
  const result = existingValues.slice();
  ['a', 'b'].forEach((filename) => {
    if (result.length < 2) result.push(`@./${filename}.${extension === 'bin' ? 'jpg' : extension}`);
  });
  return result;
};

/**
 * Rewrites generated multipart examples so file fields use curl-style local paths.
 *
 * @param media Multipart request media definition.
 * @param schemas Component schema registry used to resolve request fields.
 * @returns Named examples with file values normalized to @./path syntax.
 */
const getMultipartMediaExamples = (
  media: MediaDefinition,
  schemas: Record<string, Schema>,
): MediaExample[] => {
  const examples = getMediaExamples(media, schemas);
  const fields = getSchemaFields(media.schema, schemas);
  const composition = getSchemaComposition(media.schema, schemas);
  if (!fields.length && composition && composition.kind !== 'allOf') {
    fields.push(...getSchemaFields(composition.variants[0], schemas));
  }
  if (!fields.length) {
    const rootKind = getMultipartFieldKind(media.schema, schemas, 'file');
    if (rootKind === 'file' || rootKind === 'file-array') {
      return examples.map((example) => {
        const paths = getMultipartFilePaths('file', rootKind === 'file-array', example.value);
        return { ...example, value: rootKind === 'file-array' ? paths : paths[0] };
      });
    }
  }
  return examples.map((example) => {
    const value =
      example.value && typeof example.value === 'object' && !Array.isArray(example.value)
        ? { ...(example.value as Record<string, unknown>) }
        : {};
    fields.forEach((field) => {
      const kind = getMultipartFieldKind(field.schema, schemas, field.name);
      if (kind === 'file' || kind === 'file-array') {
        const paths = getMultipartFilePaths(field.name, kind === 'file-array', value[field.name]);
        value[field.name] = kind === 'file-array' ? paths : paths[0];
      }
    });
    return { ...example, value };
  });
};

/**
 * Builds curl form arguments for a multipart/form-data request body.
 *
 * @param media Multipart request media definition.
 * @param schemas Component schema registry used for fields and mock values.
 * @returns One -F argument per normal field and one or more -F arguments per file field.
 */
const createMultipartFormArguments = (media: MediaDefinition, schemas: Record<string, Schema>) => {
  const example = getMultipartMediaExamples(media, schemas)[0]?.value;
  const exampleRecord =
    example && typeof example === 'object' && !Array.isArray(example)
      ? (example as Record<string, unknown>)
      : {};
  const composition = getSchemaComposition(media.schema, schemas);
  const fields = getSchemaFields(media.schema, schemas);
  if (!fields.length && composition && composition.kind !== 'allOf') {
    fields.push(...getSchemaFields(composition.variants[0], schemas));
  }
  const knownNames = new Set(fields.map((field) => field.name));
  Object.keys(exampleRecord).forEach((name) => {
    if (!knownNames.has(name)) fields.push({ name, required: false, schema: {} });
  });

  if (!fields.length) {
    const rootKind = getMultipartFieldKind(media.schema, schemas, 'file');
    if (rootKind === 'file' || rootKind === 'file-array') {
      const fieldName = rootKind === 'file-array' ? 'files' : 'file';
      return getMultipartFilePaths(fieldName, rootKind === 'file-array', example).map(
        (path) => `-F ${quoteShellArgument(`${fieldName}=${path}`)}`,
      );
    }
  }

  return fields.flatMap((field) => {
    const kind = getMultipartFieldKind(field.schema, schemas, field.name);
    if (kind === 'file' || kind === 'file-array') {
      return getMultipartFilePaths(
        field.name,
        kind === 'file-array',
        exampleRecord[field.name],
      ).map((path) => `-F ${quoteShellArgument(`${field.name}=${path}`)}`);
    }
    const value = createSchemaMock(field.schema, schemas, exampleRecord[field.name], field.name);
    const values = Array.isArray(value) ? value : [value];
    return values.map(
      (item) => `-F ${quoteShellArgument(`${field.name}=${formatParameterMock(item)}`)}`,
    );
  });
};

/**
 * Resolves the first executable authentication alternative for a curl example.
 *
 * @param operation Operation whose security may override document defaults.
 * @param document Export document containing referenced security schemes.
 * @returns Header, query, cookie and command arguments required by the selected scheme group.
 */
const getCurlSecurity = (operation: Operation, document: OpenApiDocument) => {
  const result = {
    commandArguments: [] as string[],
    cookies: [] as string[],
    headers: [] as Array<[string, string]>,
    query: [] as Array<[string, string]>,
  };
  if (operation['x-nextdoc4j-security']?.ignore === true) return result;
  const requirement = (operation.security ?? document.security ?? []).find(
    (item) => Object.keys(item).length > 0,
  );
  if (!requirement) {
    if (getSecurityMetadataDisplay(operation)?.rules.length) {
      result.headers.push(['Authorization', 'Bearer mock-access-token']);
    }
    return result;
  }
  const schemes = document.components?.securitySchemes ?? {};
  Object.keys(requirement).forEach((key) => {
    const scheme = schemes[key];
    if (!scheme) return;
    if (scheme.type === 'apiKey') {
      const name = scheme.name || key;
      if (scheme.in === 'query') result.query.push([name, 'mock-api-key']);
      else if (scheme.in === 'cookie') result.cookies.push(`${name}=mock-api-key`);
      else result.headers.push([name, 'mock-api-key']);
      return;
    }
    if (scheme.type === 'http' && scheme.scheme?.toLowerCase() === 'basic') {
      result.commandArguments.push(`-u ${quoteShellArgument('demo:Example@123')}`);
      return;
    }
    result.headers.push(['Authorization', 'Bearer mock-access-token']);
  });
  return result;
};

/**
 * Creates a directly executable curl command from one documented operation.
 *
 * @param operation Operation whose path, parameters, security and body should be represented.
 * @param document Export document containing servers, security schemes and component schemas.
 * @returns Multi-line curl command containing concrete Path, Query, Header, Cookie and Body values.
 */
const createCurlExample = (operation: ApiOperation, document: OpenApiDocument) => {
  const schemas = document.components?.schemas ?? {};
  let path = operation.path;
  const query: Array<[string, string]> = [];
  const headers: Array<[string, string]> = [];
  const cookies: string[] = [];
  const eventStream = producesEventStream(operation);

  (operation.parameters ?? []).forEach((parameter) => {
    const value = formatParameterMock(getParameterMock(parameter, schemas));
    if (parameter.in === 'path')
      path = path.replaceAll(`{${parameter.name}}`, encodeURIComponent(value));
    if (parameter.in === 'query') query.push([parameter.name, value]);
    if (parameter.in === 'header') headers.push([parameter.name, value]);
    if (parameter.in === 'cookie') cookies.push(`${parameter.name}=${value}`);
  });
  path = path.replaceAll(/\{([^}]+)\}/gu, (_placeholder, name: string) =>
    encodeURIComponent(String(createSchemaMock(undefined, schemas, undefined, name))),
  );

  const security = getCurlSecurity(operation, document);
  query.push(...security.query);
  headers.push(...security.headers);
  cookies.push(...security.cookies);

  const rawServer = document.servers?.[0]?.url?.replace(/\/+$/u, '') || 'http://localhost';
  const server = rawServer.startsWith('/') ? `http://localhost${rawServer}` : rawServer;
  const queryString = query.length
    ? `?${query.map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`).join('&')}`
    : '';
  const url = `${server}${path.startsWith('/') ? path : `/${path}`}${queryString}`;
  const requestContent = Object.entries(operation.requestBody?.content ?? {});
  const selectedBody =
    requestContent.find(([contentType]) => isMediaType(contentType, 'multipart/form-data')) ??
    requestContent.find(([contentType]) => contentType.toLowerCase().includes('json')) ??
    requestContent[0];
  const multipart = selectedBody ? isMediaType(selectedBody[0], 'multipart/form-data') : false;
  const argumentsList = [
    `curl${eventStream ? ' -N' : ''} -X ${operation.method.toUpperCase()}`,
    quoteShellArgument(url),
  ];
  const outputHeaders: Array<[string, string]> = [
    ['Accept', eventStream ? 'text/event-stream' : 'application/json'],
    ...headers.filter(
      ([name]) =>
        name.toLowerCase() !== 'accept' && !(multipart && name.toLowerCase() === 'content-type'),
    ),
  ];
  outputHeaders.forEach(([name, value]) => {
    argumentsList.push(`-H ${quoteShellArgument(`${name}: ${value}`)}`);
  });
  if (cookies.length) argumentsList.push(`-b ${quoteShellArgument(cookies.join('; '))}`);
  argumentsList.push(...security.commandArguments);

  if (selectedBody) {
    const [contentType, media] = selectedBody;
    if (multipart) {
      argumentsList.push(...createMultipartFormArguments(media, schemas));
    } else {
      const body =
        getMediaExamples(media, schemas)[0]?.value ?? createSchemaMock(media.schema, schemas);
      argumentsList.push(`-H ${quoteShellArgument(`Content-Type: ${contentType}`)}`);
      argumentsList.push(
        `--data-raw ${quoteShellArgument(
          contentType.toLowerCase().includes('json') || typeof body !== 'string'
            ? toPrettyJson(body)
            : body,
        )}`,
      );
    }
  }
  return argumentsList.join(' \\\n  ');
};

/**
 * Detects the standard code/msg/success/timestamp/data response wrapper.
 *
 * @param schema Response schema that may reference or compose the common wrapper.
 * @param schemas Component schema registry.
 * @returns Wrapper metadata including the business data schema, or undefined when fields differ.
 */
const getResponseEnvelope = (
  schema: Schema | undefined,
  schemas: Record<string, Schema>,
): ResponseEnvelope | undefined => {
  const resolved = getResolvedSchema(schema, schemas);
  if (!resolved) return undefined;
  const candidates = [resolved, ...(resolved.oneOf ?? []), ...(resolved.anyOf ?? [])];
  for (const candidate of candidates) {
    const candidateSchema = getResolvedSchema(candidate, schemas) ?? candidate;
    const fields = getSchemaFields(candidateSchema, schemas);
    const fieldsByName = new Map(fields.map((field) => [field.name, field]));
    if (!['code', 'msg', 'success', 'timestamp', 'data'].every((name) => fieldsByName.has(name))) {
      continue;
    }
    return {
      dataSchema: fieldsByName.get('data')!.schema,
      fields,
    };
  }
  return undefined;
};

/**
 * Extracts business data examples from normalized common-wrapper examples.
 *
 * @param media Response media definition containing wrapper examples.
 * @param envelope Detected common response wrapper.
 * @param schemas Component schema registry.
 * @returns Named examples containing only the data business value.
 */
const getEnvelopeDataExamples = (
  media: MediaDefinition,
  envelope: ResponseEnvelope,
  schemas: Record<string, Schema>,
) =>
  getMediaExamples(media, schemas).map((example) => {
    const record =
      example.value && typeof example.value === 'object' && !Array.isArray(example.value)
        ? (example.value as Record<string, unknown>)
        : {};
    return {
      label: example.label,
      value: createSchemaMock(envelope.dataSchema, schemas, record.data, 'data'),
    };
  });

/**
 * Classifies an OpenAPI response key as an error response.
 *
 * @param status HTTP status code or default response key.
 * @returns True for 4xx, 5xx and default responses.
 */
const isErrorResponse = (status: string) => /^[45]/u.test(status) || status === 'default';

/**
 * Detects a binary or Base64 response schema that should not render as JSON fields.
 *
 * @param schema Response schema to inspect.
 * @param schemas Component schema registry.
 * @param seenReferences Component references already traversed to stop circular schemas.
 * @returns True when schema metadata identifies binary or encoded content.
 */
const isBinaryResponseSchema = (
  schema: Schema | undefined,
  schemas: Record<string, Schema>,
  seenReferences = new Set<string>(),
): boolean => {
  if (!schema) return false;
  const referenceName = schema.$ref ? schemaName(schema) : '';
  if (referenceName) {
    if (seenReferences.has(referenceName)) return false;
    const nextReferences = new Set(seenReferences);
    nextReferences.add(referenceName);
    return isBinaryResponseSchema(schemas[referenceName], schemas, nextReferences);
  }
  const format = schema.format?.toLowerCase();
  const encoding = schema.contentEncoding?.toLowerCase();
  if (format === 'binary' || format === 'byte' || format === 'base64') return true;
  if (encoding === 'binary' || encoding === 'base64') return true;
  if (schema.contentMediaType && !schema.contentMediaType.toLowerCase().includes('json'))
    return true;
  return [...(schema.oneOf ?? []), ...(schema.anyOf ?? []), ...(schema.allOf ?? [])].some(
    (variant) => isBinaryResponseSchema(variant, schemas, seenReferences),
  );
};

/**
 * Determines whether one successful response media entry is not a JSON document.
 *
 * @param contentType Declared response Content-Type.
 * @param schema Response schema associated with the media type.
 * @param schemas Component schema registry.
 * @returns True for SSE, text, XML, CSV, downloads, images and encoded payload schemas.
 */
const isNonJsonResponseMedia = (
  contentType: string,
  schema: Schema | undefined,
  schemas: Record<string, Schema>,
) => {
  const normalizedType = contentType.split(';')[0]?.trim().toLowerCase() || '';
  if (normalizedType !== '*/*' && !normalizedType.includes('json')) return true;
  return isBinaryResponseSchema(schema, schemas);
};

/**
 * Classifies one operation by the structure of its successful responses.
 *
 * @param operation Operation whose non-error responses should be classified.
 * @param schemas Component schema registry used to detect common wrappers.
 * @returns A for wrapped responses, B for unwrapped JSON and C for non-JSON or bodyless responses.
 */
const getOperationResponseClass = (
  operation: Operation,
  schemas: Record<string, Schema>,
): OperationResponseClass => {
  let hasUnwrappedJson = false;
  for (const [status, response] of Object.entries(operation.responses ?? {})) {
    if (isErrorResponse(status)) continue;
    for (const [contentType, media] of Object.entries(response.content ?? {})) {
      if (isNonJsonResponseMedia(contentType, media.schema, schemas)) continue;
      if (getResponseEnvelope(media.schema, schemas)) return 'A';
      hasUnwrappedJson = true;
    }
  }
  return hasUnwrappedJson ? 'B' : 'C';
};

/**
 * Counts wrapped, unwrapped JSON and non-JSON operations in the selected export scope.
 *
 * @param operations Selected operations in their preserved export order.
 * @param schemas Component schema registry used by response classification.
 * @returns A/B/C counts and their total for the document overview.
 */
const getResponseClassStats = (
  operations: ApiOperation[],
  schemas: Record<string, Schema>,
): ResponseClassStats => {
  const stats: ResponseClassStats = { A: 0, B: 0, C: 0, total: operations.length };
  operations.forEach((operation) => {
    stats[getOperationResponseClass(operation, schemas)] += 1;
  });
  return stats;
};

/**
 * Creates the plain-language replacement for a non-JSON response field table and example.
 *
 * @param contentType Declared response Content-Type.
 * @param schema Response schema used to distinguish encoded payloads.
 * @param schemas Component schema registry.
 * @returns SSE-specific guidance or a generic non-JSON response explanation.
 */
const getNonJsonResponseExplanation = (
  contentType: string,
  schema: Schema | undefined,
  schemas: Record<string, Schema>,
) => {
  if (isMediaType(contentType, 'text/event-stream')) {
    return '该接口返回 `text/event-stream` 格式的事件流，非 JSON 结构，请求返回后应保持连接持续读取，无法用固定 JSON 示例表示。';
  }
  const responseType = isBinaryResponseSchema(schema, schemas)
    ? '二进制或 Base64'
    : `\`${contentType}\``;
  return `该接口返回 ${responseType} 格式的非 JSON 内容，请按实际响应格式直接读取，无法用固定 JSON 示例表示。`;
};

/**
 * Builds one compact error-response summary row.
 *
 * @param status HTTP error status or default response key.
 * @param response OpenAPI response definition.
 * @param schemas Component schema registry.
 * @returns Error code, response description and representative message.
 */
const getErrorResponseRow = (
  status: string,
  response: ResponseDefinition,
  schemas: Record<string, Schema>,
) => {
  const media =
    Object.entries(response.content ?? {}).find(([contentType]) =>
      contentType.toLowerCase().includes('json'),
    )?.[1] ?? Object.values(response.content ?? {})[0];
  const example = media ? getMediaExamples(media, schemas)[0] : undefined;
  const record =
    example?.value && typeof example.value === 'object' && !Array.isArray(example.value)
      ? (example.value as Record<string, unknown>)
      : {};
  const explicitCode = record.code;
  const explicitMessage = record.message ?? record.msg;
  const errorCode =
    explicitCode !== null && explicitCode !== undefined && String(explicitCode).trim()
      ? String(explicitCode)
      : status === 'default'
        ? 'DEFAULT_ERROR'
        : `HTTP_${status}`;
  const message =
    explicitMessage !== null && explicitMessage !== undefined && String(explicitMessage).trim()
      ? String(explicitMessage)
      : response.description || '请求失败';
  return {
    code: errorCode === '0' ? `HTTP_${status}` : errorCode,
    description: response.description || '-',
    message: message === '操作成功' ? response.description || '请求失败' : message,
    status,
  };
};

/**
 * Locates the first common response wrapper used by selected operations.
 *
 * @param operations Selected operations in their original export order.
 * @param document Export document containing component schemas.
 * @returns First detected wrapper, or undefined when responses use unrelated shapes.
 */
const findCommonResponseEnvelope = (
  operations: ApiOperation[],
  document: OpenApiDocument,
): ResponseEnvelope | undefined => {
  const schemas = document.components?.schemas ?? {};
  for (const operation of operations) {
    for (const [status, response] of Object.entries(operation.responses ?? {})) {
      if (isErrorResponse(status)) continue;
      for (const media of Object.values(response.content ?? {})) {
        const envelope = getResponseEnvelope(media.schema, schemas);
        if (envelope) return envelope;
      }
    }
  }
  return undefined;
};

/**
 * Renders one operation with authentication, location-aware inputs and independent responses.
 *
 * @param operation Selected source-aware operation.
 * @param document Export subset used for security and schema lookup.
 * @returns Markdown section containing the complete operation contract.
 */
const createOperationMarkdown = (operation: ApiOperation, document: OpenApiDocument) => {
  const schemas = document.components?.schemas ?? {};
  const responseClass = getOperationResponseClass(operation, schemas);
  const lines = [
    `#### ${operation.method.toUpperCase()} \`${operation.path}\`${operation.summary ? ` · ${operation.summary}` : ''}`,
  ];
  if (operation.description?.trim())
    lines.push('', clampMarkdownHeadings(operation.description.trim()));

  lines.push('', '**鉴权方式**', '', ...getOperationSecurityLines(operation, document));
  appendOperationParameters(lines, operation, schemas);

  const requestContent = Object.entries(operation.requestBody?.content ?? {});
  if (requestContent.length) {
    lines.push('', '**Body 请求体**');
    if (operation.requestBody?.description?.trim())
      lines.push('', clampMarkdownHeadings(operation.requestBody.description.trim()));
    lines.push('', `- 必填：${operation.requestBody?.required ? '是' : '否'}`);
    requestContent.forEach(([contentType, media], index) => {
      if (index > 0) lines.push('', '---');
      lines.push('', `**Content-Type：\`${contentType}\`**`);
      appendSchemaDocumentation(
        lines,
        media.schema,
        schemas,
        contentType,
        isMediaType(contentType, 'multipart/form-data')
          ? getMultipartMediaExamples(media, schemas)
          : getMediaExamples(media, schemas),
        '请求体',
      );
    });
  }

  lines.push('', '**curl 示例**', '', '```bash', createCurlExample(operation, document), '```');

  const responses = Object.entries(operation.responses ?? {});
  lines.push('', '**响应参数**');
  if (responseClass === 'B') {
    lines.push('', '> ⚠️ 该接口不使用统一响应包装结构，直接返回如下内容：');
  }
  if (!responses.length) {
    lines.push('', '未声明响应。');
  } else {
    const successfulResponses = responses.filter(([status]) => !isErrorResponse(status));
    const errorResponses = responses.filter(([status]) => isErrorResponse(status));
    successfulResponses.forEach(([status, response], responseIndex) => {
      if (responseIndex > 0) lines.push('', '---');
      lines.push(
        '',
        `**HTTP ${status}${response.description ? ` — ${response.description}` : ''}**`,
      );
      const responseContent = Object.entries(response.content ?? {});
      if (!responseContent.length) {
        lines.push('', '- Content-Type：未声明', '- 响应体：无');
        return;
      }
      responseContent.forEach(([contentType, media], contentIndex) => {
        if (contentIndex > 0) lines.push('', '---');
        lines.push('', `**Content-Type：\`${contentType}\`**`);
        if (isNonJsonResponseMedia(contentType, media.schema, schemas)) {
          lines.push('', getNonJsonResponseExplanation(contentType, media.schema, schemas));
          return;
        }
        const envelope = getResponseEnvelope(media.schema, schemas);
        appendSchemaDocumentation(
          lines,
          envelope?.dataSchema ?? media.schema,
          schemas,
          contentType,
          envelope
            ? getEnvelopeDataExamples(media, envelope, schemas)
            : getMediaExamples(media, schemas),
          envelope ? 'data 业务' : '响应',
        );
      });
    });
    if (errorResponses.length) {
      lines.push(
        '',
        '**错误响应汇总**',
        '',
        '| HTTP状态码 | 错误码 | 说明 | 示例 message |',
        '| --- | --- | --- | --- |',
      );
      errorResponses.forEach(([status, response]) => {
        const error = getErrorResponseRow(status, response, schemas);
        lines.push(
          `| ${escapeTableCell(error.status)} | ${escapeTableCell(error.code)} | ${escapeTableCell(error.description)} | ${escapeTableCell(error.message)} |`,
        );
      });
    }
  }
  return lines.join('\n');
};

/**
 * Creates source-aware operations for compatibility callers that pass a raw document.
 *
 * @param document OpenAPI document containing paths.
 * @returns Operations in declaration order with their first Tag as group metadata.
 */
const getDocumentOperations = (document: OpenApiDocument): ApiOperation[] =>
  Object.entries(document.paths ?? {}).flatMap(([path, pathItem]) =>
    Object.entries(pathItem).flatMap(([method, operation]) =>
      operation && !Array.isArray(operation)
        ? [
            {
              ...operation,
              group: operation.tags?.[0] || '默认分组',
              method: method as ApiOperation['method'],
              path,
            },
          ]
        : [],
    ),
  );

/**
 * Normalizes a raw document into the shared export document model.
 *
 * @param input Prepared export model or raw OpenAPI document.
 * @returns Shared model used by Markdown, HTML, Word and preview output.
 */
const normalizeExportModel = (
  input: ExportDocumentModel | OpenApiDocument,
): ExportDocumentModel => {
  if ('sections' in input && 'document' in input) return input;
  return {
    description: input.info?.description?.trim() || '',
    document: input,
    sections: [],
    title: input.info?.title || 'OpenAPI 文档',
  };
};

/**
 * Groups compatibility operations by their original OpenAPI Tag order.
 *
 * @param operations Operations extracted from a raw OpenAPI document.
 * @returns Stable operation sections suitable for directory and h3 group headings.
 */
const groupFallbackOperations = (operations: ApiOperation[]): ExportOperationSection[] => {
  const sections = new Map<string, ExportOperationSection>();
  operations.forEach((operation) => {
    const groupName = operation.group || '默认分组';
    const section = sections.get(groupName);
    if (section) section.operations.push(operation);
    else sections.set(groupName, { groupName, key: groupName, operations: [operation] });
  });
  return [...sections.values()];
};

/**
 * Builds the unique visible h3 heading used by a document group and its directory anchor.
 *
 * @param section Service-aware or single-service operation section.
 * @returns Group heading including service ownership when aggregation is enabled.
 */
const getSectionHeading = (section: ExportOperationSection) =>
  section.serviceName
    ? `微服务：${section.serviceName} / 分组：${section.groupName}`
    : `分组：${section.groupName}`;

/**
 * Creates the canonical Markdown representation used by every export format and preview.
 *
 * @param input Prepared export model or raw OpenAPI document for compatibility callers.
 * @returns Composition-aware Markdown with grouped endpoints, examples and entity definitions.
 */
export const createOpenApiMarkdown = (input: ExportDocumentModel | OpenApiDocument) => {
  const model = normalizeExportModel(input);
  const { document } = model;
  const schemas = document.components?.schemas ?? {};
  const fallbackOperations = getDocumentOperations(document);
  const sections = model.sections.length
    ? model.sections
    : groupFallbackOperations(fallbackOperations);
  const operations = sections.flatMap((section) => section.operations);
  const operationCount = operations.length;
  const responseStats = getResponseClassStats(operations, schemas);
  const commonEnvelope = findCommonResponseEnvelope(operations, document);
  const entitySchemas = Object.entries(schemas).filter(
    ([, schema]) => !getResponseEnvelope(schema, schemas),
  );
  const lines = [`# ${model.title}`, ''];
  if (model.description) lines.push(clampMarkdownHeadings(model.description), '');
  lines.push('## 目录', '');
  sections.forEach((section) => {
    const heading = getSectionHeading(section);
    lines.push(`- [${heading}](#${createMarkdownHeadingId(heading)})`);
  });
  lines.push(
    '',
    '## 文档概览',
    '',
    '| 访问地址 | 接口鉴权 | 接口数量 | 数据实体 |',
    '| --- | --- | --- | --- |',
    `| ${escapeTableCell(document.servers?.[0]?.url || '未声明')} | ${escapeTableCell(getDocumentSecurityLabel(document))} | ${operationCount} | ${entitySchemas.length} |`,
    '',
    `- OpenAPI 版本：${document.openapi || '-'}`,
    `- 文档版本：${document.info?.version || '-'}`,
  );

  if (responseStats.total && responseStats.A * 2 < responseStats.total) {
    lines.push(
      '',
      '**通用响应包装结构**',
      '',
      '本文档接口的响应结构不统一，请参考各接口的“响应参数”部分。',
    );
  } else if (commonEnvelope) {
    lines.push(
      '',
      '**通用响应包装结构**',
      '',
      `> 以下 ${responseStats.A}/${responseStats.total} 个接口的成功响应使用统一包装结构；其余接口（未包装的原始数据、SSE 流式响应、非 JSON 格式响应等）会在各自的响应部分单独完整展示，不套用此结构。`,
      '',
      '| 字段 | 类型 | 必填 | 说明 |',
      '| --- | --- | --- | --- |',
    );
    commonEnvelope.fields.forEach((field) => {
      const dataField = field.name === 'data';
      const type = dataField ? '因接口而异' : getSchemaLabel(field.schema);
      const required = dataField ? '否' : field.required ? '是' : '否';
      const description = dataField
        ? '响应数据，具体结构见各接口“data 业务字段”'
        : field.schema.description || '-';
      lines.push(`| ${field.name} | ${type} | ${required} | ${escapeTableCell(description)} |`);
    });
  }

  lines.push('', '## 接口详情');

  sections.forEach((section) => {
    lines.push('', `### ${getSectionHeading(section)}`);
    section.operations.forEach((operation) => {
      lines.push('', createOperationMarkdown(operation, document));
    });
  });

  if (entitySchemas.length) {
    lines.push('', '## 数据实体');
    entitySchemas.forEach(([name, schema]) => {
      lines.push('', `### ${name}`);
      if (schema.description?.trim())
        lines.push('', clampMarkdownHeadings(schema.description.trim()));
      appendSchemaDocumentation(
        lines,
        schema,
        schemas,
        'application/json',
        [{ label: '实体示例', value: createSchemaMock(schema, schemas) }],
        '实体',
      );
    });
  }
  return `${lines.join('\n')}\n`;
};
