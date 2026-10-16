export type HttpMethod = 'delete' | 'get' | 'head' | 'options' | 'patch' | 'post' | 'put';

export interface Schema {
  $dynamicRef?: string;
  $ref?: string;
  accessMode?: string;
  additionalProperties?: boolean | Schema;
  allOf?: Schema[];
  anyOf?: Schema[];
  const?: unknown;
  contains?: Schema;
  contentEncoding?: string;
  contentMediaType?: string;
  default?: unknown;
  deprecated?: boolean;
  description?: string;
  discriminator?: {
    mapping?: Record<string, string>;
    propertyName: string;
  };
  enum?: Array<number | string>;
  example?: unknown;
  examples?: unknown[];
  exclusiveMaximum?: boolean | number;
  exclusiveMinimum?: boolean | number;
  format?: string;
  hidden?: boolean;
  items?: Schema;
  maxItems?: number;
  maxLength?: number;
  maxProperties?: number;
  maximum?: number;
  minItems?: number;
  minLength?: number;
  minProperties?: number;
  minimum?: number;
  multipleOf?: number;
  nullable?: boolean;
  oneOf?: Schema[];
  pattern?: string;
  prefixItems?: Schema[];
  properties?: Record<string, Schema>;
  readOnly?: boolean;
  required?: string[];
  title?: string;
  type?: string | string[];
  types?: string[];
  unevaluatedItems?: boolean | Schema;
  uniqueItems?: boolean;
  writeOnly?: boolean;
  'x-nextdoc4j-enum'?: {
    items?: Array<{
      description?: string;
      value: number | string;
    }>;
  };
}

export interface ExampleDefinition {
  $ref?: string;
  description?: string;
  externalValue?: string;
  summary?: string;
  value?: unknown;
}

export interface Parameter {
  $ref?: string;
  content?: Record<string, MediaDefinition>;
  description?: string;
  example?: unknown;
  examples?: Record<string, ExampleDefinition>;
  explode?: boolean;
  in: 'cookie' | 'header' | 'path' | 'query';
  name: string;
  required?: boolean;
  schema?: Schema;
  style?: string;
}

export interface MediaDefinition {
  encoding?: Record<
    string,
    {
      allowReserved?: boolean;
      contentType?: string;
      explode?: boolean;
      style?: string;
    }
  >;
  example?: unknown;
  examples?: Record<string, ExampleDefinition>;
  schema?: Schema;
}

export interface ResponseHeader {
  $ref?: string;
  content?: Record<string, MediaDefinition>;
  deprecated?: boolean;
  description?: string;
  example?: unknown;
  examples?: Record<string, ExampleDefinition>;
  required?: boolean;
  schema?: Schema;
}

export interface ResponseDefinition {
  $ref?: string;
  content?: Record<string, MediaDefinition>;
  description?: string;
  headers?: Record<string, ResponseHeader>;
}

export interface Operation {
  description?: string;
  operationId?: string;
  parameters?: Parameter[];
  requestBody?: {
    $ref?: string;
    content?: Record<string, MediaDefinition>;
    description?: string;
    required?: boolean;
  };
  responses?: Record<string, ResponseDefinition>;
  security?: SecurityRequirement[];
  summary?: string;
  tags?: string[];
  'x-nextdoc4j-security'?: NextdocSecurityMetadata;
  'x-order'?: number | string;
}

export interface NextdocSecurityRule {
  mode?: string;
  orType?: string;
  orValues?: string[];
  type?: string;
  values?: string[];
}

export interface NextdocSecurityMetadata {
  ignore?: boolean;
  permissions?: NextdocSecurityRule[];
  roles?: NextdocSecurityRule[];
}

export type Paths = Record<
  string,
  Partial<Record<HttpMethod, Operation>> & { parameters?: Parameter[] }
>;

export interface ServiceDefinition {
  contextPath?: string;
  disabled?: boolean;
  name: string;
  reason?: string;
  serviceId?: string;
  status?: 'DOWN' | 'UNKNOWN' | 'UP';
  url: string;
  'x-order'?: number | string;
}

export interface SwaggerConfig {
  configUrl?: string;
  urls?: ServiceDefinition[];
  'x-nextdoc4j-gateway'?: {
    globalSecuritySchemes?: Record<string, SecurityScheme>;
    services?: ServiceDefinition[];
  };
}

export interface OpenApiDocument {
  components?: {
    examples?: Record<string, ExampleDefinition>;
    headers?: Record<string, ResponseHeader>;
    parameters?: Record<string, Parameter>;
    requestBodies?: Record<string, NonNullable<Operation['requestBody']>>;
    responses?: Record<string, ResponseDefinition>;
    schemas?: Record<string, Schema>;
    securitySchemes?: Record<string, SecurityScheme>;
  };
  info?: {
    contact?: {
      email?: string;
      name?: string;
      url?: string;
    };
    description?: string;
    license?: {
      name?: string;
      url?: string;
    };
    title?: string;
    version?: string;
  };
  openapi?: string;
  paths?: Paths;
  security?: SecurityRequirement[];
  servers?: Array<{ description?: string; url: string }>;
  tags?: Array<{ description?: string; name: string; 'x-order'?: number | string }>;
  'x-nextdoc4j'?: {
    brand?: { footerText?: string; logo?: string; title?: string };
    markdown?: Array<{
      content: string;
      contentLength?: number | string;
      displayName: string;
      group: string;
      lastModified?: string;
    }>;
    version?: string;
  };
  'x-nextdoc4j-aggregation'?: {
    aggregation?: boolean;
    docPath?: string;
    serviceSwaggerConfigEnabled?: boolean;
  };
}

export interface SecurityScheme {
  bearerFormat?: string;
  description?: string;
  in?: 'cookie' | 'header' | 'query';
  name?: string;
  scheme?: string;
  type: string;
}

export type SecurityRequirement = Record<string, string[]>;

export interface ApiOperation extends Operation {
  group: string;
  method: HttpMethod;
  path: string;
  searchText?: string;
  sourceGroupId?: string;
  sourceGroupName?: string;
}
