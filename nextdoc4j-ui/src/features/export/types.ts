import type { ApiOperation, OpenApiDocument } from '../../types/openapi';

export interface AggregationExportGroup {
  name: string;
  operationKeys: string[];
}

export interface AggregationExportDocument {
  document: OpenApiDocument;
  groups: AggregationExportGroup[];
  serviceName: string;
  serviceUrl: string;
}

export interface AggregationExportResult {
  documents: AggregationExportDocument[];
  failures: string[];
}

export interface ExportOperationEntry {
  groupName: string;
  key: string;
  operation: ApiOperation;
  serviceName?: string;
}

export interface ExportOperationSection {
  groupName: string;
  key: string;
  operations: ApiOperation[];
  serviceName?: string;
}

export interface ExportDocumentModel {
  description: string;
  document: OpenApiDocument;
  sections: ExportOperationSection[];
  title: string;
}
