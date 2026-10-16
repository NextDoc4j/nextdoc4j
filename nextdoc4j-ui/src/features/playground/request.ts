import type { DebugBodyKind, DebugParameter, DebugRequestInput } from './types';
import { resolveRequestBase } from '../../lib/http';

const enabled = (items: DebugParameter[] = []) =>
  items.filter((item) => item.enabled && item.name.trim());

const normalizeHeaderName = (value: string) => value.trim().toLowerCase();

const isJsonContentType = (value: string) => value.includes('/json') || value.endsWith('+json');

/**
 * Maps an OpenAPI media type to the request editor mode.
 *
 * @param contentType OpenAPI request content type.
 * @returns Editor mode suitable for the content type.
 */
export const resolveBodyKind = (contentType?: string): DebugBodyKind => {
  const normalized = (contentType || '').toLowerCase().split(';')[0].trim();
  if (!normalized) return 'none';
  if (normalized === 'multipart/form-data') return 'form-data';
  if (normalized === 'application/x-www-form-urlencoded') return 'urlencoded';
  if (normalized === 'application/octet-stream') return 'binary';
  if (isJsonContentType(normalized)) return 'json';
  if (normalized.includes('xml')) return 'xml';
  return 'raw';
};

/**
 * Replaces OpenAPI path placeholders with declared parameter values.
 *
 * @param path OpenAPI path template.
 * @param pathParams Editable path parameter values.
 * @returns URL-safe endpoint path.
 */
export const applyPathParameters = (path: string, pathParams: DebugParameter[] = []) =>
  pathParams
    .filter((parameter) => parameter.enabled && parameter.name.trim() && parameter.value !== '')
    .reduce(
      (current, parameter) =>
        current.replaceAll(`{${parameter.name.trim()}}`, encodeURIComponent(parameter.value)),
      path,
    );

/**
 * Builds the exact browser request from the playground's editable state.
 *
 * @param input Current API, parameter, authentication and body configuration.
 * @returns URL, headers, body and cURL-relevant request metadata.
 */
export const buildDebugRequest = (input: DebugRequestInput) => {
  const path = applyPathParameters(input.path, input.pathParams);
  const requestPrefix = input.requestPrefix || '';
  const endpoint = `${resolveRequestBase(requestPrefix, input.apiBase).replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
  const url = new URL(endpoint, input.origin);
  enabled(input.queryParams).forEach((item) => url.searchParams.append(item.name, item.value));
  input.globalQueryParams
    ?.filter(
      (item) =>
        item.enabled !== false && item.name.trim() && !url.searchParams.has(item.name.trim()),
    )
    .forEach((item) => url.searchParams.append(item.name.trim(), item.value));

  const headers = new Headers();
  input.globalHeaders
    ?.filter((item) => item.enabled !== false && item.name.trim())
    .forEach((item) => headers.set(item.name.trim(), item.value));
  enabled(input.headers).forEach((item) => headers.set(item.name.trim(), item.value));
  const cookies = enabled(input.cookies);
  input.securityCredentials?.forEach((credential) => {
    if (credential.in === 'header' && !headers.get(credential.name)?.trim()) {
      headers.set(credential.name, credential.value);
    }
    if (credential.in === 'query' && !url.searchParams.has(credential.name)) {
      url.searchParams.append(credential.name, credential.value);
    }
    if (
      credential.in === 'cookie' &&
      !cookies.some((cookie) => cookie.name.trim() === credential.name)
    ) {
      cookies.push({ enabled: true, name: credential.name, value: credential.value });
    }
  });
  if (input.authToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${input.authToken}`);
  }

  const method = input.method.toUpperCase();
  const canHaveBody = !['GET', 'HEAD'].includes(method);
  const formFields = enabled(input.formFields);
  const formFiles = input.formFiles ?? [];
  const urlEncodedFields = enabled(input.urlEncodedFields);
  const bodyKind = canHaveBody ? input.bodyKind : 'none';
  let body: BodyInit | undefined;
  let bodyPreview = '';

  if (bodyKind === 'form-data') {
    const formData = new FormData();
    formFields.forEach((item) =>
      formData.append(
        item.name,
        item.contentType && item.contentType !== 'text/plain'
          ? new Blob([item.value], { type: item.contentType })
          : item.value,
      ),
    );
    formFiles.forEach((item) =>
      formData.append(
        item.name,
        item.contentType && item.contentType !== item.file.type
          ? new File([item.file], item.file.name, { type: item.contentType })
          : item.file,
      ),
    );
    body = formData;
    bodyPreview = [
      ...formFields.map((item) => `${item.name}=${item.value}`),
      ...formFiles.map((item) => `${item.name}=@${item.file.name}`),
    ].join('\n');
    // The browser must generate multipart boundaries itself.
    headers.delete('Content-Type');
  } else if (bodyKind === 'urlencoded') {
    const searchParams = new URLSearchParams();
    urlEncodedFields.forEach((item) => searchParams.append(item.name, item.value));
    body = searchParams;
    bodyPreview = searchParams.toString();
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/x-www-form-urlencoded');
    }
  } else if (bodyKind === 'binary' && input.binaryFile) {
    body = input.binaryFile;
    bodyPreview = `@${input.binaryFile.name}`;
    if (!headers.has('Content-Type')) {
      headers.set(
        'Content-Type',
        input.contentType || input.binaryFile.type || 'application/octet-stream',
      );
    }
  } else if (bodyKind !== 'none' && input.bodyText) {
    body = input.bodyText;
    bodyPreview = input.bodyText;
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', input.contentType || 'application/json');
    }
  }

  // Explicit session exclusions take precedence even over automatically generated headers.
  for (const parameter of input.excludedParameters ?? []) {
    if (parameter.in === 'header') headers.delete(parameter.name);
    if (parameter.in === 'query') url.searchParams.delete(parameter.name);
  }

  return {
    body,
    bodyKind,
    bodyPreview,
    cookies: cookies.filter(
      (cookie) =>
        !(input.excludedParameters ?? []).some(
          (parameter) => parameter.in === 'cookie' && parameter.name === cookie.name.trim(),
        ),
    ),
    formFields,
    formFiles,
    headers,
    method,
    url,
    urlEncodedFields,
  };
};

/**
 * Produces a terminal-friendly representation of a browser debug request.
 *
 * @param request Request metadata created by buildDebugRequest.
 * @returns A cURL command including headers, body fields and target URL.
 */
export const createCurlCommand = (request: ReturnType<typeof buildDebugRequest>) => {
  const escape = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
  const bodyArguments =
    request.formFiles.length || request.formFields.length
      ? [
          ...request.formFields.map(
            (item) =>
              `--form ${escape(`${item.name}=${item.value}${item.contentType ? `;type=${item.contentType}` : ''}`)}`,
          ),
          ...request.formFiles.map(
            (item) =>
              `--form ${escape(`${item.name}=@${item.file.name}${item.contentType ? `;type=${item.contentType}` : ''}`)}`,
          ),
        ]
      : request.bodyPreview
        ? [
            `${request.bodyKind === 'binary' ? '--data-binary' : '--data'} ${escape(request.bodyPreview)}`,
          ]
        : [];
  return [
    `curl --request ${request.method}`,
    ...[...request.headers.entries()].map(
      ([name, value]) => `--header ${escape(`${name}: ${value}`)}`,
    ),
    ...(request.cookies.length && !request.headers.has('Cookie')
      ? [
          `--cookie ${escape(request.cookies.map((item) => `${encodeURIComponent(item.name)}=${encodeURIComponent(item.value)}`).join('; '))}`,
        ]
      : []),
    ...bodyArguments,
    escape(request.url.toString()),
  ].join(' \\\n  ');
};

/**
 * Checks whether browser cookies can be set for a debug target.
 *
 * @param requestUrl Request URL that will receive cookies.
 * @param origin Current page origin.
 * @returns True only for same-origin requests where JavaScript cookie access is allowed.
 */
export const canApplyBrowserCookies = (requestUrl: URL, origin: string) =>
  requestUrl.origin === new URL(origin).origin;

/**
 * Converts playground cookie parameters into document.cookie assignments.
 *
 * @param cookies Enabled cookie parameters.
 * @returns Cookie strings safe to assign on a same-origin browser page.
 */
export const createBrowserCookies = (cookies: DebugParameter[]) =>
  enabled(cookies).map(
    (item) =>
      `${encodeURIComponent(item.name)}=${encodeURIComponent(item.value)}; Path=/; SameSite=Lax`,
  );

export const hasHeader = (headers: Headers, headerName: string) =>
  headers.has(normalizeHeaderName(headerName));
