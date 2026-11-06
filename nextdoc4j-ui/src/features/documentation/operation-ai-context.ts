import type { ApiOperation, OpenApiDocument } from '../../types/openapi';
import { createOperationMarkdown } from '../export/markdown';

/**
 * Resolves the first declared server as the base URL shown to an AI assistant.
 *
 * @param document OpenAPI document whose servers describe the request origin.
 * @returns Declared server URL without trailing slashes, or undefined when absent.
 */
const getServerUrl = (document: OpenApiDocument) =>
  document.servers
    ?.find((server) => server.url?.trim())
    ?.url.trim()
    .replace(/\/+$/u, '');

/**
 * Creates a self-contained prompt describing one operation for frontend implementation.
 *
 * The prompt contains structured basic information followed by the same complete
 * operation contract used by Markdown export: authentication, Sa-Token rules,
 * parameters, request body, curl example and responses.
 *
 * @param operation Selected source-aware operation.
 * @param document Document containing servers, security schemes and component schemas.
 * @returns Markdown context that can be pasted directly into an AI assistant.
 */
export const createOperationAiContext = (operation: ApiOperation, document: OpenApiDocument) => {
  const tags = operation.tags?.length ? operation.tags : [operation.group].filter(Boolean);
  const baseInfo = [
    `- 请求方法：${operation.method.toUpperCase()}`,
    `- 请求路径：\`${operation.path}\``,
    `- 接口名称：${operation.summary || operation.operationId || '未命名接口'}`,
  ];
  if (operation.operationId) baseInfo.push(`- operationId：\`${operation.operationId}\``);
  if (tags.length) baseInfo.push(`- 所属分组：${tags.join(' / ')}`);
  const serverUrl = getServerUrl(document);
  if (serverUrl) baseInfo.push(`- Base URL：\`${serverUrl}\``);

  return [
    '请根据以下接口契约完成前端对接实现：',
    '',
    '- 生成请求参数与响应数据的 TypeScript 类型定义；',
    '- 生成可直接调用的请求方法，并处理鉴权、错误响应和统一响应包装；',
    '- 给出调用示例，并说明需要注意的字段、枚举和必填项。',
    '',
    '## 基础信息',
    '',
    ...baseInfo,
    '',
    '## 接口契约',
    '',
    createOperationMarkdown(operation, document),
  ].join('\n');
};
