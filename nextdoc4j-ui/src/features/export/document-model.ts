import type { OpenApiDocument } from '../../types/openapi';
import type { ExportDocumentModel, ExportOperationEntry, ExportOperationSection } from './types';

/**
 * Builds one export document shared by preview and every downloadable format.
 *
 * @param document Dependency-complete OpenAPI subset selected for export.
 * @param entries Selected operations decorated with service and group ownership.
 * @param title Application-level document title resolved with the workspace branding rules.
 * @param description Application-level document description resolved from the same OpenAPI source.
 * @returns Export model with normalized metadata and stable service/group sections.
 */
export const createExportDocumentModel = (
  document: OpenApiDocument,
  entries: ExportOperationEntry[],
  title: string,
  description: string,
): ExportDocumentModel => {
  const sections = new Map<string, ExportOperationSection>();
  entries.forEach((entry) => {
    const key = `${entry.serviceName || ''}:${entry.groupName}`;
    const section = sections.get(key);
    if (section) {
      section.operations.push(entry.operation);
      return;
    }
    sections.set(key, {
      groupName: entry.groupName,
      key,
      operations: [entry.operation],
      serviceName: entry.serviceName,
    });
  });

  const normalizedTitle = title.trim() || document.info?.title || 'OpenAPI 文档';
  const normalizedDescription = description.trim() || document.info?.description?.trim() || '';
  return {
    description: normalizedDescription,
    document: {
      ...document,
      info: {
        ...document.info,
        description: normalizedDescription,
        title: normalizedTitle,
      },
    },
    sections: [...sections.values()],
    title: normalizedTitle,
  };
};
