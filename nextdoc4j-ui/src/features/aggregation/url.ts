const absoluteHttpUrlPattern = /^https?:\/\//i;

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, '');

const normalizePath = (value: string) => (value.startsWith('/') ? value : `/${value}`);

const appendPath = (prefix: string, path: string) => {
  const normalizedPrefix = trimTrailingSlashes(prefix);
  const normalizedPath = path.replace(/^\/+/, '');
  return normalizedPrefix ? `${normalizedPrefix}/${normalizedPath}` : `/${normalizedPath}`;
};

/**
 * Resolves the Swagger Config endpoint for a service OpenAPI document URL.
 *
 * @param serviceDocumentUrl Service OpenAPI document URL.
 * @returns Swagger Config URL adjacent to the service document endpoint.
 */
export const resolveServiceSwaggerConfigUrl = (serviceDocumentUrl: string) =>
  `${trimTrailingSlashes(serviceDocumentUrl.trim())}/swagger-config`;

/**
 * Derives the gateway request prefix from a service OpenAPI document URL.
 *
 * @param serviceDocumentUrl URL used to fetch a service's OpenAPI document.
 * @param docPath Gateway OpenAPI document suffix, defaulting to SpringDoc's path.
 * @returns Gateway-accessible service prefix, or the original URL when it cannot be derived.
 */
export const resolveServiceDocumentPrefix = (
  serviceDocumentUrl: string,
  docPath = '/v3/api-docs',
) => {
  const normalizedServiceUrl = trimTrailingSlashes(serviceDocumentUrl.trim());
  const normalizedDocPath = trimTrailingSlashes(normalizePath(docPath.trim()));
  return normalizedServiceUrl.endsWith(normalizedDocPath)
    ? normalizedServiceUrl.slice(0, -normalizedDocPath.length)
    : normalizedServiceUrl;
};

/**
 * Resolves a Swagger Config group URL through the selected gateway service.
 *
 * @param serviceDocumentUrl Selected service's OpenAPI document URL.
 * @param groupDocumentUrl Group URL declared by Swagger Config.
 * @param docPath Gateway OpenAPI document suffix.
 * @returns A normalized URL that can fetch the target group document.
 */
export const resolveServiceGroupDocumentUrl = (
  serviceDocumentUrl: string,
  groupDocumentUrl: string,
  docPath = '/v3/api-docs',
) => {
  const serviceUrl = trimTrailingSlashes(serviceDocumentUrl.trim());
  const groupUrl = groupDocumentUrl.trim();

  if (!groupUrl || absoluteHttpUrlPattern.test(groupUrl)) return groupUrl || serviceUrl;
  if (
    groupUrl === serviceUrl ||
    groupUrl.startsWith(`${serviceUrl}/`) ||
    groupUrl.startsWith(`${serviceUrl}?`) ||
    groupUrl.startsWith(`${serviceUrl}#`)
  ) {
    return groupUrl;
  }
  if (!groupUrl.startsWith('/')) return appendPath(serviceUrl, groupUrl);
  return appendPath(resolveServiceDocumentPrefix(serviceUrl, docPath), groupUrl);
};
