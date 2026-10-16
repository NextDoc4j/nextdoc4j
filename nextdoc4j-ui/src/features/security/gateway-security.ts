import type { OpenApiDocument, SecurityScheme, SwaggerConfig } from '../../types/openapi';

/**
 * Merges gateway and service security registries using the legacy UI lookup precedence.
 *
 * @param serviceDocument Active service or single-app document.
 * @param gatewayDocument Gateway main document in aggregation mode.
 * @param gatewayConfig Gateway Swagger Config containing optional global schemes.
 * @returns Registry where service schemes override gateway-global and gateway schemes.
 */
export const mergeGatewaySecuritySchemes = (
  serviceDocument?: OpenApiDocument,
  gatewayDocument?: OpenApiDocument,
  gatewayConfig?: SwaggerConfig,
): Record<string, SecurityScheme> => ({
  ...(gatewayDocument?.components?.securitySchemes ?? {}),
  ...(gatewayConfig?.['x-nextdoc4j-gateway']?.globalSecuritySchemes ?? {}),
  ...(serviceDocument?.components?.securitySchemes ?? {}),
});

/**
 * Creates a document view that preserves service schemas while exposing compatible auth schemes.
 *
 * @param serviceDocument Active service or single-app document.
 * @param securitySchemes Merged security registry used by settings and request construction.
 * @returns Document sharing existing content with an updated security-scheme registry.
 */
export const withSecuritySchemes = (
  serviceDocument: OpenApiDocument,
  securitySchemes: Record<string, SecurityScheme>,
): OpenApiDocument => ({
  ...serviceDocument,
  components: {
    ...serviceDocument.components,
    securitySchemes,
  },
});
