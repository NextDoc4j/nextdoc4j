import type { SelectMenuOption } from '../../components/select-menu';
import type { Schema } from '../../types/openapi';
import { resolveRequestSchema } from '../documentation/request-schema';

/**
 * Lists selectable JSON paths from interface schemas and current JSON data.
 * @param schema Declared request or response body schema.
 * @param schemas Component schemas used to resolve references.
 * @param value Current parsed JSON data, when available.
 * @returns Deduplicated paths, bounded to keep recursive models and large payloads responsive.
 */
export function getWorkflowPathOptions(
  schema: Schema,
  schemas: Record<string, Schema>,
  value?: unknown,
): SelectMenuOption[] {
  const paths = new Map<string, SelectMenuOption>();
  /**
   * Visits a body field and its children, using the first array item as a selectable example.
   * @param raw Declared field schema.
   * @param data Actual field value.
   * @param path JSONPath identifying the field.
   * @param depth Current nesting depth for recursive model protection.
   * @returns Nothing; adds options to the local path map.
   */
  const visit = (raw: Schema, data: unknown, path: string, depth: number): void => {
    if (depth > 8 || paths.size >= 200) return;
    const resolved = resolveRequestSchema(raw, schemas);
    paths.set(path, {
      value: path,
      label: resolved.description ? `${path} · ${resolved.description}` : path,
    });
    if (resolved.items || Array.isArray(data)) {
      visit(
        resolved.items ?? {},
        Array.isArray(data) ? data[0] : undefined,
        `${path}[0]`,
        depth + 1,
      );
      return;
    }
    const object = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
    for (const name of new Set([
      ...Object.keys(resolved.properties ?? {}),
      ...Object.keys(object),
    ])) {
      // Only suggest property names supported by the workflow's JSONPath reader.
      if (!name || /[.[\]]/.test(name)) continue;
      visit(resolved.properties?.[name] ?? {}, object[name], `${path}.${name}`, depth + 1);
    }
  };
  visit(schema, value, '$', 0);
  return [...paths.values()];
}
