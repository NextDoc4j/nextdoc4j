import type { DebugParameter } from './types';
import type { ApiOperation, OpenApiDocument, Parameter, Schema } from '../../types/openapi';
import type { DebugDraft } from './draft';
import { getContentTypes, getDefaultContentType, toPrettyJson } from '../openapi/utils';
import { createJsonExamplePreview } from '../documentation/json-example-model';
import { resolveRequestSchema } from '../documentation/request-schema';
import { getResponseExample, resolveResponseReference } from '../documentation/response-schema';
import { resolveBodyKind } from './request';
import { createFormParameters, isFormContentType } from './form-parameters';
import { jsonToXml } from './body-format';

/**
 * Resolves reusable request definitions and merges path-level parameters with operation overrides.
 * @param operation Active operation carrying its original method and path.
 * @param document Component registries and shared path parameters.
 * @returns An operation with concrete request body and location/name-deduplicated parameters.
 */
export const resolvePlaygroundOperation = (
  operation: ApiOperation,
  document: OpenApiDocument,
): ApiOperation => {
  const parameters = new Map<string, Parameter>();
  for (const raw of [
    ...(document.paths?.[operation.path]?.parameters ?? []),
    ...(operation.parameters ?? []),
  ]) {
    const parameter = resolveResponseReference(raw, document.components);
    if (parameter.name && parameter.in)
      parameters.set(`${parameter.in}:${parameter.name}`, parameter);
  }
  for (const match of operation.path.matchAll(/\{([^{}]+)\}/g)) {
    const name = match[1];
    if (!parameters.has(`path:${name}`)) {
      parameters.set(`path:${name}`, { name, in: 'path', required: true });
    }
  }
  return {
    ...operation,
    parameters: [...parameters.values()],
    requestBody: operation.requestBody
      ? resolveResponseReference(operation.requestBody, document.components)
      : undefined,
  };
};

/**
 * Creates editable defaults from one OpenAPI parameter location.
 * @param operation Active operation with resolved parameter references.
 * @param location Path, Query, Header or Cookie location.
 * @param document Registries used by schema and named examples.
 * @returns Declared example/default values, leaving absent values empty for placeholder display.
 */
export const defaultParameters = (
  operation: ApiOperation,
  location: Parameter['in'],
  document: OpenApiDocument,
): DebugParameter[] =>
  (operation.parameters ?? [])
    .filter((item) => item.in === location)
    .map((item) => {
      const media = Object.values(item.content ?? {})[0];
      const schema = resolveRequestSchema(
        item.schema ?? media?.schema ?? {},
        document.components?.schemas ?? {},
      );
      const value =
        (location === 'path' ? schema.default : undefined) ??
        getResponseExample(item, document.components) ??
        getResponseExample(media, document.components) ??
        schema.example ??
        schema.examples?.[0] ??
        schema.default ??
        '';
      return {
        enabled: true,
        name: item.name,
        value: typeof value === 'string' ? value : (JSON.stringify(value) ?? ''),
      };
    });

/**
 * Resolves the preferred request schema for declared and custom MIME modes.
 *
 * @param operation Active operation.
 * @param schemas Component schema registry.
 * @param contentType Active request MIME type.
 * @returns Resolved schema used by form metadata and JSON editing.
 */
export const getRequestSchema = (
  operation: ApiOperation,
  schemas: Record<string, Schema>,
  contentType: string,
) => {
  const content = operation.requestBody?.content;
  const fallbackType =
    getContentTypes(content).find((item) => /(?:\/|\+)json$/iu.test(item) || item === '*/*') ||
    getDefaultContentType(content);
  return resolveRequestSchema(
    content?.[contentType]?.schema || content?.[fallbackType]?.schema || {},
    schemas,
  );
};

/**
 * Creates one MIME-specific request draft using the preferred operation schema.
 *
 * @param operation Active operation.
 * @param document Active OpenAPI document.
 * @param contentType Selected request MIME type.
 * @param variants Selected request composition branches from the documentation view.
 * @returns Cache-safe request draft for this body mode.
 */
export const createDefaultDraft = (
  operation: ApiOperation,
  document: OpenApiDocument,
  contentType: string,
  variants: Map<string, number> = new Map(),
): DebugDraft => {
  const schemas = document.components?.schemas ?? {};
  const schema = getRequestSchema(operation, schemas, contentType);
  const bodyKind = resolveBodyKind(contentType);
  const mediaOperation: ApiOperation = operation.requestBody?.content?.[contentType]
    ? operation
    : {
        ...operation,
        requestBody: { ...operation.requestBody, content: { [contentType]: { schema } } },
      };
  const formParameters = isFormContentType(contentType)
    ? createFormParameters(mediaOperation, document, contentType)
    : [];
  const content = mediaOperation.requestBody?.content;
  const media = content?.[contentType];
  const preview = createJsonExamplePreview(
    media,
    { direction: 'request', schemas, variants },
    document.components,
    '',
  );
  const example = preview.tree?.value;
  const json = preview.tree ? (toPrettyJson(example) ?? '') : '';
  return {
    body:
      bodyKind === 'xml'
        ? `<?xml version="1.0" encoding="UTF-8"?>\n${jsonToXml(example ?? {})}`
        : bodyKind === 'none' || bodyKind === 'binary' || isFormContentType(contentType)
          ? ''
          : json,
    formFields: bodyKind === 'form-data' ? formParameters : [],
    headers: defaultParameters(operation, 'header', document),
    pathParams: defaultParameters(operation, 'path', document),
    queryParams: defaultParameters(operation, 'query', document),
    urlEncodedFields: bodyKind === 'urlencoded' ? formParameters : [],
  };
};

/** Selects the first useful request editor from resolved OpenAPI inputs.
 * @param operation Operation with shared parameters and references already resolved.
 * @returns Params for path/query inputs, otherwise the first declared input area.
 */
export const getDefaultRequestTab = (
  operation: ApiOperation,
): 'params' | 'body' | 'headers' | 'cookies' => {
  const parameters = operation.parameters ?? [];
  if (parameters.some((parameter) => parameter.in === 'path' || parameter.in === 'query'))
    return 'params';
  if (getContentTypes(operation.requestBody?.content).length) return 'body';
  if (parameters.some((parameter) => parameter.in === 'header')) return 'headers';
  if (parameters.some((parameter) => parameter.in === 'cookie')) return 'cookies';
  return 'params';
};
