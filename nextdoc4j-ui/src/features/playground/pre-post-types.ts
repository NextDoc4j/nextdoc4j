import { createId } from '../../lib/id';
import type { DebugParameter } from './types';
import type { SecurityScheme } from '../../types/openapi';

export type PrePostPhase = 'pre-request' | 'post-response';
export type WorkflowStepType =
  'request' | 'extract' | 'transform' | 'write' | 'assert' | 'security' | 'script' | 'input';
export type WorkflowFailurePolicy = 'abort' | 'continue';
export type WorkflowValueSource = 'fixed' | 'request' | 'response' | 'variable' | 'flow' | 'result';
export type CryptoAlgorithm =
  'md5-hex-lower' | 'md5-hex-upper' | 'sha256' | 'aes-cbc' | 'base64' | 'rsa-oaep' | 'rsa-pkcs1';
export type WorkflowTransform =
  | CryptoAlgorithm
  | 'trim'
  | 'uppercase'
  | 'lowercase'
  | 'json-parse'
  | 'json-stringify'
  | 'to-string'
  | 'to-number'
  | 'to-boolean'
  | 'url-encode'
  | 'url-decode'
  | 'base64-decode';

export const workflowTransformOptions: Array<{
  value: WorkflowTransform;
  label: string;
  category: '文本处理' | 'JSON / 类型转换' | '编码 / 解码' | '摘要' | '加密';
}> = [
  { value: 'trim', label: '去除首尾空白', category: '文本处理' },
  { value: 'uppercase', label: '转大写', category: '文本处理' },
  { value: 'lowercase', label: '转小写', category: '文本处理' },
  { value: 'json-parse', label: '解析 JSON 文本', category: 'JSON / 类型转换' },
  { value: 'json-stringify', label: '序列化为 JSON 文本', category: 'JSON / 类型转换' },
  { value: 'to-string', label: '转为文本', category: 'JSON / 类型转换' },
  { value: 'to-number', label: '转为数字', category: 'JSON / 类型转换' },
  { value: 'to-boolean', label: '转为布尔值（true / false）', category: 'JSON / 类型转换' },
  { value: 'base64', label: 'Base64 编码', category: '编码 / 解码' },
  { value: 'base64-decode', label: 'Base64 解码为 UTF-8 文本', category: '编码 / 解码' },
  { value: 'url-encode', label: 'URL 参数值编码', category: '编码 / 解码' },
  { value: 'url-decode', label: 'URL 参数值解码', category: '编码 / 解码' },
  { value: 'md5-hex-lower', label: 'MD5 小写', category: '摘要' },
  { value: 'md5-hex-upper', label: 'MD5 大写', category: '摘要' },
  { value: 'sha256', label: 'SHA-256', category: '摘要' },
  { value: 'aes-cbc', label: 'AES-128-CBC', category: '加密' },
  { value: 'rsa-oaep', label: 'RSA-OAEP', category: '加密' },
  { value: 'rsa-pkcs1', label: 'RSA PKCS#1 v1.5（后端 PKCS1Padding）', category: '加密' },
];
export interface WorkflowStep {
  id: string;
  name: string;
  type: WorkflowStepType;
  enabled: boolean;
  failurePolicy: WorkflowFailurePolicy;
  trigger?: 'auto' | 'manual';
  source?: WorkflowValueSource;
  sourcePart?: 'body' | 'headers' | 'query' | 'path' | 'form' | 'urlencoded' | 'status' | 'text';
  resultStepId?: string;
  path?: string;
  value?: string;
  saveAs?: string;
  scope?: 'run' | 'flow';
  condition?: { source: 'variable' | 'flow' | 'response'; path: string; expected?: string };
  targetField?: string;
  targetType?:
    | 'body'
    | 'text'
    | 'header'
    | 'query'
    | 'path'
    | 'form'
    | 'urlencoded'
    | 'cookie'
    | 'variable'
    | 'flow'
    | 'security';
  algorithm?: WorkflowTransform;
  key?: string;
  iv?: string;
  rsaPublicKey?: string;
  rsaHash?: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';
  writeBack?: boolean;
  endpoint?: string;
  previewPath?: string;
  method?: string;
  requestBody?: string;
  requestHeaders?: string;
  inheritHeaders?: boolean;
  requestBodyKind?: 'auto' | 'json' | 'text' | 'urlencoded' | 'form-data';
  allowHttpErrors?: boolean;
  operator?: 'equals' | 'contains' | 'not-empty';
  expectedValue?: string;
  scriptCode?: string;
}
export interface PrePostPhaseConfig {
  steps: WorkflowStep[];
}
export interface WorkflowResponse {
  json?: unknown;
  status: number;
  text: string;
  headers?: Record<string, string>;
  image?: string;
}
export interface WorkflowRuntime {
  variables: Record<string, unknown>;
  flow: Record<string, unknown>;
  results: Record<string, unknown>;
}
export interface WorkflowContext {
  body: string;
  bodyKind?: string;
  inheritedHeaders?: Record<string, string>;
  headers: DebugParameter[];
  queryParams: DebugParameter[];
  pathParams?: DebugParameter[];
  formFields?: DebugParameter[];
  urlEncodedFields?: DebugParameter[];
  cookies?: DebugParameter[];
  runtime?: WorkflowRuntime;
  response?: WorkflowResponse;
  apiBase?: string;
  origin?: string;
  requestPrefix?: string;
  sendBrowserCredentials?: boolean;
  securityValues?: Record<string, string>;
  securityKeys?: string[];
  securitySchemes?: Record<string, SecurityScheme>;
  files?: Array<{ name: string; file: Blob }>;
  manualStepId?: string;
  signal?: AbortSignal;
  onLog: (entry: ConsoleLogEntry) => void;
  onSecurityValuesChange?: (values: Record<string, string>) => void;
  setBody: (body: string) => void;
  setHeaders: (headers: DebugParameter[]) => void;
  setQueryParams: (params: DebugParameter[]) => void;
  setPathParams?: (params: DebugParameter[]) => void;
  setFormFields?: (params: DebugParameter[]) => void;
  setUrlEncodedFields?: (params: DebugParameter[]) => void;
  setCookies?: (params: DebugParameter[]) => void;
}
export interface ConsoleLogEntry {
  category: string;
  content: string;
  phase: 'assert' | 'net' | 'post' | 'pre';
  status?: 'fail' | 'info' | 'pass' | 'skip';
  time: string;
}
export const workflowStepLabels: Record<WorkflowStepType, string> = {
  request: '发送辅助请求',
  extract: '提取并保存变量',
  transform: '转换数据',
  write: '设置请求参数',
  assert: '条件校验',
  security: '回填认证',
  script: 'JS 脚本',
  input: '填写变量后再发送',
};

/** Checks whether a step can run independently of sending the main request.
 * @param step Step configuration, including its write destination.
 * @returns True when the step does not require modifying or gating the main request.
 */
export const canRunWorkflowStepManually = (step: WorkflowStep): boolean => {
  if (step.type === 'input') return false;
  if (step.type === 'transform') return !step.writeBack;
  if (step.type === 'write') return step.targetType === 'variable' || step.targetType === 'flow';
  return true;
};
/** Creates one enabled step with phase-appropriate defaults.
 * @param type Requested operation.
 * @param phase Owning phase.
 * @returns A new step with an independent identity.
 */
export const createWorkflowStep = (type: WorkflowStepType, phase: PrePostPhase): WorkflowStep => ({
  id: createId(),
  name: workflowStepLabels[type],
  type,
  enabled: true,
  failurePolicy: 'abort',
  trigger: 'auto',
  source: type === 'input' ? 'flow' : phase === 'pre-request' ? 'request' : 'response',
  sourcePart: 'body',
  algorithm: 'trim',
  writeBack: type === 'transform' && phase === 'pre-request',
  operator: 'not-empty',
  targetType: 'body',
  scope: 'run',
  method: 'GET',
});
