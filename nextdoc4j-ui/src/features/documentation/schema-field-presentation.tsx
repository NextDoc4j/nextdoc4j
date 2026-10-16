import type { ReactNode } from 'react';
import type { Schema } from '../../types/openapi';
import { getRequestType, getRequestTypeLabel } from './request-schema';

/** Shared field heading for request, response and entity trees; schema behavior stays with callers. */
export function SchemaFieldHead({
  name,
  schema,
  schemas,
  required,
  requiredLabel = '必填',
  onCopyName,
  description,
  children,
}: {
  name: string;
  schema: Schema;
  schemas: Record<string, Schema>;
  required: boolean;
  requiredLabel?: string;
  onCopyName: () => void;
  description?: ReactNode;
  children?: ReactNode;
}) {
  const format = schema.format && schema.format !== 'binary' ? schema.format : undefined;
  return (
    <div className="operation-request__field-head">
      <button
        type="button"
        className="operation-request__field-name"
        onClick={onCopyName}
        title="点击复制字段名"
      >
        {name}
      </button>
      <span
        className="operation-request__type-badge schema-type"
        data-type={getRequestType(schema)}
      >
        <span>{getRequestTypeLabel(schema, schemas)}</span>
        {format && <span className="operation-request__type-format">({format})</span>}
      </span>
      <span
        className={`operation-request__req-badge ${required ? 'operation-request__req-badge--required' : 'operation-request__req-badge--optional'}`}
      >
        {required ? requiredLabel : '可选'}
      </span>
      {description}
      {children}
    </div>
  );
}

/** Compact, consistently aligned schema metadata in all three field views. */
export function SchemaMetadataRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="operation-request__metadata-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
