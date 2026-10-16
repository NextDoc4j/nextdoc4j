import type { ApiOperation, OpenApiDocument, Schema } from '../../types/openapi';
import { getSchemaEnumItems, getSchemaTypes, hasSchemaDefaultValue } from '../openapi/schema';
import { decodeJsonPointerToken, getDefaultContentType } from '../openapi/utils';
import { getRequestRanges, resolveRequestSchema } from './request-schema';
import { resolveResponseReference } from './response-schema';

interface TypeDefinition {
  name: string;
  /** An absent schema represents a response that declares no body. */
  schema?: Schema;
  description?: string;
}

/** Formats documentation as a safe JSDoc block, including multiline Markdown.
 * @param schema Field or model metadata containing descriptions, examples and constraints.
 * @param indent Indentation shared by the owning declaration.
 * @returns A comment followed by a newline, or an empty string when no metadata exists.
 */
function schemaComment(schema: Schema, indent = ''): string {
  const enums = getSchemaEnumItems(schema);
  const lines = [
    schema.description || schema.title,
    schema.format && `@format ${schema.format}`,
    ...getRequestRanges(schema),
    schema.pattern && `@pattern ${schema.pattern}`,
    ...enums
      .filter((item) => item.description)
      .map((item) => `${JSON.stringify(item.value)} - ${item.description}`),
    schema.example !== undefined && `@example ${JSON.stringify(schema.example)}`,
    ...(schema.examples ?? []).map((example) => `@example ${JSON.stringify(example)}`),
    hasSchemaDefaultValue(schema.default) && `@default ${JSON.stringify(schema.default)}`,
    schema.deprecated && '@deprecated',
    schema.oneOf?.length && 'oneOf：仅匹配一种结构',
    schema.anyOf?.length && 'anyOf：至少匹配一种结构',
    schema.allOf?.length && 'allOf：同时满足全部结构',
  ].filter((line): line is string => typeof line === 'string' && Boolean(line));
  if (!lines.length) return '';
  return `${indent}/**\n${lines
    .join('\n')
    .replaceAll('*/', '* /')
    .split(/\r?\n/)
    .map((line) => `${indent} * ${line}`)
    .join('\n')}\n${indent} */\n`;
}

/** Converts schema names to safe TypeScript identifiers without losing collision detection.
 * @param value Original model name, including possible generic or path punctuation.
 * @returns A non-reserved identifier suitable for a type declaration.
 */
function typeName(value: string): string {
  const name = value.replaceAll(/[^a-zA-Z0-9_$]/g, '_') || 'Model';
  const normalized = name[0].toUpperCase() + name.slice(1);
  return /^[a-zA-Z_$]/.test(normalized) &&
    ![
      'Array',
      'Record',
      'Blob',
      'Object',
      'String',
      'Number',
      'Boolean',
      'Date',
      'Promise',
    ].includes(normalized)
    ? normalized
    : `Api${normalized}`;
}

/** Generates standalone types from original schemas, retaining all composition branches.
 * @param roots Named parameter groups or the active response definition.
 * @param schemas Component registry used for local references and recursive model declarations.
 * @param direction Visibility rules for request and response fields.
 * @returns Copyable TypeScript with JSDoc, optional fields and all referenced model declarations.
 */
function generateTypes(
  roots: TypeDefinition[],
  schemas: Record<string, Schema>,
  direction: 'request' | 'response',
): string {
  const queue = [...roots];
  const names = new Set(roots.map((root) => root.name));
  const references = new Map<string, string>();

  /** Registers one local reference before visiting its children, allowing recursive objects.
   * @param ref Original JSON pointer into the schema registry.
   * @returns A declared model name, or an annotated unknown for unresolved or cyclic aliases.
   */
  function referenceType(ref: string): string {
    const prefix = '#/components/schemas/';
    const key = ref.startsWith(prefix) ? decodeJsonPointerToken(ref.slice(prefix.length)) : '';
    if (!key || !Object.hasOwn(schemas, key))
      return `unknown /* 未解析的引用：${ref.replaceAll('*/', '* /').replaceAll(/[\r\n]/g, ' ')} */`;
    const trail = new Set<string>();
    let alias: Schema | undefined = schemas[key];
    while (alias?.$ref) {
      if (trail.has(alias.$ref)) return 'unknown /* 循环别名未声明实体结构 */';
      trail.add(alias.$ref);
      const aliasKey: string = alias.$ref.startsWith(prefix)
        ? decodeJsonPointerToken(alias.$ref.slice(prefix.length))
        : '';
      alias = Object.hasOwn(schemas, aliasKey) ? schemas[aliasKey] : undefined;
    }
    const existing = references.get(ref);
    if (existing) return existing;
    const base = typeName(key);
    let name = base;
    let suffix = 2;
    while (names.has(name)) name = `${base}${suffix++}`;
    names.add(name);
    references.set(ref, name);
    queue.push({ name, schema: schemas[key] });
    return name;
  }

  /** Maps a schema expression to TypeScript without flattening unions or intersections.
   * @param schema Original schema at the current property or composition branch.
   * @param depth Object indentation depth.
   * @returns A valid type expression with explicit parentheses for combined operators.
   */
  function render(schema: Schema, depth = 0): string {
    const parts: string[] = [];
    if (schema.$ref) parts.push(referenceType(schema.$ref));
    for (const keyword of ['allOf', 'oneOf', 'anyOf'] as const) {
      if (schema[keyword]?.length)
        parts.push(
          `(${schema[keyword].map((branch) => `(${render(branch, depth)})`).join(keyword === 'allOf' ? ' & ' : ' | ')})`,
        );
    }
    const declaredTypes = getSchemaTypes(schema);
    const types = declaredTypes.filter((type) => type !== 'null');
    if (!types.length && !declaredTypes.length) {
      if (schema.items || schema.prefixItems) types.push('array');
      else if (
        schema.properties ||
        schema.additionalProperties !== undefined ||
        schema.required?.length
      )
        types.push('object');
    }
    const baseTypes = types.map((type): string => {
      if (type === 'integer' || type === 'number') return 'number';
      if (type === 'string') return schema.format === 'binary' ? 'Blob' : 'string';
      if (type === 'boolean') return 'boolean';
      if (type === 'array') {
        if (schema.prefixItems?.length) {
          const items = schema.prefixItems.map((item) => render(item, depth));
          if (schema.items || schema.unevaluatedItems !== false)
            items.push(`...Array<${render(schema.items ?? {}, depth)}>`);
          return `[${items.join(', ')}]`;
        }
        return `Array<${render(schema.items ?? {}, depth)}>`;
      }
      if (type !== 'object') return 'unknown';
      const indent = '  '.repeat(depth + 1);
      const properties = Object.entries(schema.properties ?? {}).filter(([, raw]) => {
        const field = resolveRequestSchema(raw, schemas);
        return (
          !field.hidden &&
          !(direction === 'request'
            ? field.readOnly || field.accessMode?.toUpperCase() === 'READ_ONLY'
            : field.writeOnly || field.accessMode?.toUpperCase() === 'WRITE_ONLY')
        );
      });
      const fields = properties.map(([key, raw]) => {
        const field = resolveRequestSchema(raw, schemas);
        const name = /^[a-zA-Z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
        return `${schemaComment(field, indent)}${indent}${name}${schema.required?.includes(key) ? '' : '?'}: ${render(raw, depth + 1)};`;
      });
      // Required-only composition branches must still narrow optional properties from other branches.
      for (const key of schema.required ?? []) {
        if (!Object.hasOwn(schema.properties ?? {}, key))
          fields.push(`${indent}${JSON.stringify(key)}: unknown;`);
      }
      const object = fields.length ? `{\n${fields.join('\n')}\n${'  '.repeat(depth)}}` : '';
      const extra = schema.additionalProperties;
      if (extra && typeof extra === 'object') {
        const dictionary = `Record<string, ${render(extra, depth)}>`;
        return object ? `(${object} & ${dictionary})` : dictionary;
      }
      if (extra === true)
        return object ? `(${object} & Record<string, unknown>)` : 'Record<string, unknown>';
      return (
        object ||
        (parts.length
          ? 'object'
          : extra === false
            ? 'Record<string, never>'
            : 'Record<string, unknown>')
      );
    });
    const enumValues = schema.enum ?? getSchemaEnumItems(schema).map((item) => item.value);
    const hasLiteral =
      schema.const !== undefined || schema.enum !== undefined || enumValues.length > 0;
    if (
      baseTypes.length &&
      (!hasLiteral || types.some((type) => type === 'object' || type === 'array'))
    )
      parts.push(baseTypes.length > 1 ? `(${baseTypes.join(' | ')})` : baseTypes[0]);
    if (schema.const !== undefined) parts.push(literalType(schema.const));
    else if (schema.enum || enumValues.length)
      parts.push(enumValues.length ? `(${enumValues.map(literalType).join(' | ')})` : 'never');
    let result = parts.length
      ? parts.join(' & ')
      : declaredTypes.length && declaredTypes.every((type) => type === 'null')
        ? 'null'
        : 'unknown';
    if (schema.nullable || declaredTypes.includes('null')) result = `(${result}) | null`;
    return result;
  }

  const declarations: string[] = [];
  for (let index = 0; index < queue.length; index++) {
    const { name, schema, description } = queue[index];
    declarations.push(
      `${schemaComment({ ...schema, description: description || schema?.description })}export type ${name} = ${schema ? render(schema) : 'void'};`,
    );
  }
  return declarations.join('\n\n');
}

/** Renders JSON constants as TypeScript literal types, including object and array constants.
 * @param value JSON value declared by const or enum.
 * @returns A type expression representing the literal value.
 */
function literalType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `[${value.map(literalType).join(', ')}]`;
  if (typeof value === 'object')
    return `{ ${Object.entries(value)
      .map(([key, child]) => `${JSON.stringify(key)}: ${literalType(child)};`)
      .join(' ')} }`;
  return JSON.stringify(value) ?? 'unknown';
}

/** Generates all request parameter groups for the currently selected content type.
 * @param operation Active operation, including parameters and request body.
 * @param schemas Component schemas for referenced types.
 * @param contentType Active request media type.
 * @returns Standalone request types, independent of search filters and selected union previews.
 */
export function createRequestTypes(
  operation: ApiOperation,
  schemas: Record<string, Schema>,
  contentType: string,
): string {
  const roots: TypeDefinition[] = [];
  for (const location of ['path', 'query', 'header', 'cookie'] as const) {
    const parameters = (operation.parameters ?? []).filter(
      (parameter) => parameter.in === location,
    );
    if (!parameters.length) continue;
    roots.push({
      name: `${typeName(location)}Params`,
      description: `${operation.summary || operation.path} · ${location} 参数`,
      schema: {
        type: 'object',
        properties: Object.fromEntries(
          parameters.map((parameter) => [
            parameter.name,
            {
              ...parameter.schema,
              description: parameter.description ?? parameter.schema?.description,
              example: parameter.example ?? parameter.schema?.example,
            },
          ]),
        ),
        required: parameters
          .filter((parameter) => location === 'path' || parameter.required)
          .map((parameter) => parameter.name),
      },
    });
  }
  const body = operation.requestBody;
  if (body?.content?.[contentType])
    roots.push({
      name: 'RequestBody',
      description: [
        body.description ||
          resolveRequestSchema(body.content[contentType].schema ?? {}, schemas).description ||
          operation.summary,
        `${contentType} · 请求体${body.required ? '必填' : '可选'}`,
      ]
        .filter(Boolean)
        .join('\n'),
      schema: body.content[contentType].schema ?? {},
    });
  return generateTypes(roots, schemas, 'request') || '// 此接口未声明请求参数。';
}

/** Generates all response codes, content types and headers in one standalone declaration set.
 * @param operation Active operation containing all declared response definitions.
 * @param components Document registries for schema and response header references.
 * @returns Annotated response types named by status and format, with shared models declared once.
 */
export function createResponseTypes(
  operation: ApiOperation,
  components: OpenApiDocument['components'],
): string {
  const roots: TypeDefinition[] = [];
  for (const [code, raw] of Object.entries(operation.responses ?? {})) {
    const response = resolveResponseReference(raw, components);
    const name = typeName(`Response${code}`);
    const description = `${code} ${response.description || ''}`;
    const formats = Object.entries(response.content ?? {});
    if (response.unresolvedReference) {
      roots.push({
        name: `${name}Body`,
        schema: {},
        description: `${description}\n未解析的响应引用：${response.unresolvedReference}`,
      });
    } else if (!formats.length) {
      roots.push({ name: `${name}Body`, description: `${description}\n未声明响应体` });
    } else {
      formats.forEach(([mime, definition], index) => {
        roots.push({
          name: `${name}Body${formats.length > 1 ? `_${index + 1}_${typeName(mime)}` : ''}`,
          schema: definition.schema ?? {},
          description: `${description}\n${mime}`,
        });
      });
    }
    const headers = Object.entries(response.headers ?? {}).map(
      ([headerName, header]) => [headerName, resolveResponseReference(header, components)] as const,
    );
    if (headers.length) {
      roots.push({
        name: `${name}Headers`,
        description: `${description}\n响应头`,
        schema: {
          type: 'object',
          properties: Object.fromEntries(
            headers.map(([headerName, header]) => [
              headerName,
              {
                ...(header.schema ??
                  header.content?.[getDefaultContentType(header.content)]?.schema),
                description: header.unresolvedReference
                  ? `未解析的响应头引用：${header.unresolvedReference}`
                  : (header.description ?? header.schema?.description),
                deprecated: header.deprecated,
              },
            ]),
          ),
          required: headers
            .filter(([, header]) => header.required)
            .map(([headerName]) => headerName),
        },
      });
    }
  }
  return generateTypes(roots, components?.schemas ?? {}, 'response') || '// 此接口未声明响应参数。';
}
