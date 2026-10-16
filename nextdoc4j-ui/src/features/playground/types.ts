import type { HttpMethod } from '../../types/openapi';
import type { SecurityCredential } from '../security/security';

export type DebugBodyKind = 'binary' | 'form-data' | 'json' | 'none' | 'raw' | 'urlencoded' | 'xml';

export interface DebugFileField {
  contentType?: string;
  file: File;
  name: string;
}

export interface DebugParameter {
  contentType?: string;
  enabled: boolean;
  name: string;
  value: string;
}

export interface GlobalHeader {
  description?: string;
  enabled?: boolean;
  id: string;
  name: string;
  value: string;
}

export interface DebugRequestInput {
  excludedParameters?: Array<{ in: 'header' | 'query' | 'cookie'; name: string }>;
  apiBase: string;
  authToken?: string;
  binaryFile?: File;
  bodyKind: DebugBodyKind;
  bodyText?: string;
  contentType?: string;
  cookies?: DebugParameter[];
  formFields?: DebugParameter[];
  formFiles?: DebugFileField[];
  globalHeaders?: Array<Pick<DebugParameter, 'name' | 'value'> & { enabled?: boolean }>;
  globalQueryParams?: Array<Pick<DebugParameter, 'name' | 'value'> & { enabled?: boolean }>;
  headers?: DebugParameter[];
  method: HttpMethod;
  origin: string;
  path: string;
  pathParams?: DebugParameter[];
  queryParams?: DebugParameter[];
  requestPrefix?: string;
  securityCredentials?: SecurityCredential[];
  urlEncodedFields?: DebugParameter[];
}

export interface BuiltDebugRequest {
  body?: BodyInit;
  bodyKind: DebugBodyKind;
  bodyPreview?: string;
  cookies: DebugParameter[];
  formFields: DebugParameter[];
  formFiles: DebugFileField[];
  headers: Headers;
  method: string;
  url: URL;
  urlEncodedFields: DebugParameter[];
}

export interface SseEvent {
  data: string;
  event: string;
  id?: string;
  parsed?: unknown;
  sequence: number;
  time: string;
}
