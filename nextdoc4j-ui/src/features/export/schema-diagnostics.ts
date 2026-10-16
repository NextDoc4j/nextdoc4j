import { schemaName } from '../openapi/utils';
import type { Schema } from '../../types/openapi';

/**
 * Reports recursive and unsupported schema branches separately from executable JSON examples.
 * @param schema Exported request, response or entity schema.
 * @param schemas Local component registry.
 * @returns Up to 20 distinct notes, with bounded depth and node visits for large documents.
 */
export function describeSchemaLimits(
  schema: Schema | undefined,
  schemas: Record<string, Schema>,
): string[] {
  const notes = new Set<string>();
  let visited = 0;
  /** Walks schema keywords without traversing business examples or defaults.
   * @param node Current schema definition.
   * @param trail Reference names in the current branch.
   * @param depth Current schema depth.
   * @returns Nothing; collects human-readable limits outside generated example data.
   */
  const visit = (node: Schema | undefined, trail: Set<string>, depth: number): void => {
    if (!node || notes.size >= 20) return;
    if (++visited > 2000 || depth > 40) {
      notes.add('结构过深或过大，引用检查已停止展开；完整定义请查看 OpenAPI 原文。');
      return;
    }
    if (node.$dynamicRef) notes.add(`动态引用尚未展开：${node.$dynamicRef}`);
    if (node.$ref) {
      const name = schemaName(node);
      if (trail.has(name)) {
        notes.add(
          `循环引用 ${name}：不再重复展开；示例中的 reference 为引用提示，不代表接口业务字段。`,
        );
        return;
      }
      if (!node.$ref.startsWith('#/components/schemas/') || !Object.hasOwn(schemas, name)) {
        notes.add(`未解析引用：${node.$ref}`);
        return;
      }
      visit(schemas[name], new Set(trail).add(name), depth + 1);
    }
    for (const name in node.properties ?? {}) {
      if (visited > 2000 || notes.size >= 20) break;
      visit(node.properties![name], trail, depth + 1);
    }
    for (const keyword of ['allOf', 'oneOf', 'anyOf', 'prefixItems'] as const)
      for (const child of node[keyword] ?? []) {
        if (visited > 2000 || notes.size >= 20) break;
        visit(child, trail, depth + 1);
      }
    visit(node.items, trail, depth + 1);
    if (typeof node.additionalProperties === 'object')
      visit(node.additionalProperties, trail, depth + 1);
  };
  visit(schema, new Set(), 0);
  return [...notes];
}
