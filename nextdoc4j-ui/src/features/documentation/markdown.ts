import type { OpenApiDocument } from '../../types/openapi';

export interface MarkdownDocument {
  content: string;
  contentLength?: number | string;
  displayName: string;
  group: string;
  lastModified?: string;
}

/**
 * Reads and deterministically orders additional Nextdoc4j Markdown documents.
 *
 * @param document Active OpenAPI document.
 * @returns Markdown documents grouped by the extension's display group.
 */
export const groupMarkdownDocuments = (document?: OpenApiDocument) => {
  const groups = new Map<string, MarkdownDocument[]>();
  (document?.['x-nextdoc4j']?.markdown ?? []).forEach((item) => {
    if (!item.displayName.trim()) return;
    const group = item.group?.trim() || '其它文档';
    const documents = groups.get(group) ?? [];
    documents.push({
      content: item.content,
      contentLength: item.contentLength,
      displayName: item.displayName,
      group,
      lastModified: item.lastModified,
    });
    groups.set(group, documents);
  });

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right, 'zh-CN'))
    .map(([group, documents]) => [
      group,
      [...documents].sort((left, right) =>
        left.displayName.localeCompare(right.displayName, 'zh-CN'),
      ),
    ]) as Array<[string, MarkdownDocument[]]>;
};

/**
 * Locates a Markdown document by its group and display name.
 *
 * @param document Active OpenAPI document.
 * @param group Requested Markdown group.
 * @param displayName Requested document display name.
 * @returns Matching document, or undefined when the Hash state is stale or invalid.
 */
export const findMarkdownDocument = (
  document: OpenApiDocument | undefined,
  group?: string,
  displayName?: string,
) =>
  groupMarkdownDocuments(document)
    .find(([currentGroup]) => currentGroup === group)?.[1]
    .find((item) => item.displayName === displayName);
