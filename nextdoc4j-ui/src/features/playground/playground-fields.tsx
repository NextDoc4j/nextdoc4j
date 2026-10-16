import { DeleteButton } from '../../components/rare-ui/delete-button';
import { useMovingHighlight } from '../../components/rare-ui/use-moving-highlight';
import { useListMotion } from '../../components/rare-ui/use-list-motion';
import { Input } from '../../components/input';
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { IconFile, IconMaximize, IconRestore } from '@tabler/icons-react';

import { Modal } from '../../components/modal';
import { Tooltip } from '../../components/tooltip';
import { SelectMenu } from '../../components/select-menu';
import { CodeEditor, type CodeEditorFieldMeta } from '../../components/code-editor';
import { formatBytes } from './response-metrics';
import type { DebugParameter } from './types';

export interface PlaygroundFieldRow {
  contentType?: string;
  description?: string;
  enumItems?: Array<{ description?: string; value: number | string }>;
  fileField?: boolean;
  files?: File[];
  multiple?: boolean;
  id: string;
  item: DebugParameter;
  locked?: boolean;
  nameLocked?: boolean;
  overridden?: boolean;
  inherited?: boolean;
  onRestore?: () => void;
  sessionState?: string;
  placeholder?: string;
  removeLocked?: boolean;
  required?: boolean;
  source: '认证' | '接口' | '全局';
}

interface PlaygroundFieldsProps {
  allowContentType?: boolean;
  headerNames?: boolean;
  hideMetadata?: boolean;
  onAdd?: (parameter: DebugParameter) => string;
  onFileChange?: (id: string, files: File[]) => void;
  onRemove?: (id: string) => void;
  onToggleAll?: (enabled: boolean, ids: string[]) => void;
  onUpdate: (id: string, patch: Partial<DebugParameter>) => void;
  rows: PlaygroundFieldRow[];
}

const commonContentTypes = [
  'text/plain',
  'application/json',
  'application/xml',
  'application/octet-stream',
  'image/png',
  'image/jpeg',
  'application/pdf',
];

/**
 * Uses the global hover surface for debugger actions and schema annotations.
 * @param props Trigger content and optional explanatory text.
 * @returns The shared tooltip, disabled when no text is available.
 */
export function PlaygroundHint({ children, text }: { children: ReactNode; text?: string }) {
  return (
    <Tooltip className="playground-hint" content={text} disabled={!text}>
      {children}
    </Tooltip>
  );
}

/**
 * Lets testers inspect and edit large body payloads, auth tokens and JSON values without inline overflow.
 *
 * @param props Modal title, controlled source text, syntax mode and save callback.
 * @returns An accessible modal with syntax coloring, nested folding and accurate byte lengths.
 */
export function LongValueDialog({
  name,
  onClose,
  onSave,
  value,
  language = 'text',
  getFieldDescription,
  getFieldOptions,
  getFieldMeta,
}: {
  name: string;
  language?: 'json' | 'xml' | 'text';
  getFieldDescription?: (path: Array<string | number>, source: string) => string;
  getFieldOptions?: (
    path: Array<string | number>,
    source: string,
  ) => Array<{ value: number | string; description?: string }>;
  getFieldMeta?: (path: Array<string | number>, source: string) => CodeEditorFieldMeta | undefined;
  onClose: () => void;
  onSave: (value: string) => void;
  value: string;
}) {
  const [draft, setDraft] = useState(value);

  return (
    <Modal
      open
      onClose={onClose}
      title={name || '参数值'}
      size="large"
      className="playground-long-value"
      footer={
        <>
          <span className="ui-modal__footer-note">{draft.length} 字符</span>
          <button onClick={onClose} type="button">
            取消
          </button>
          <button
            className="is-primary"
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            type="button"
          >
            应用
          </button>
        </>
      }
    >
      <CodeEditor
        ariaLabel="完整参数值"
        autoFocus
        language={language}
        getFieldDescription={getFieldDescription}
        getFieldOptions={getFieldOptions}
        getFieldMeta={getFieldMeta}
        onChange={setDraft}
        value={draft}
      />
    </Modal>
  );
}

/**
 * Displays the selected files in a detailed preview modal for single or multiple file upload parameters.
 *
 * @param props Modal title, file array, multiple-upload flag, string fallback value and close callback.
 * @returns An accessible modal with clean file list, file size tags, and MIME types.
 */
export function FileListDialog({
  name,
  files,
  multiple,
  value,
  onClose,
}: {
  name: string;
  files?: File[];
  multiple?: boolean;
  value?: string;
  onClose: () => void;
}) {
  interface FilePreviewItem {
    name: string;
    size?: number;
    type?: string;
  }

  const fileItems = useMemo<FilePreviewItem[]>(() => {
    if (files && files.length > 0) {
      return files.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type || undefined,
      }));
    }
    if (value && value.trim()) {
      return value
        .split(',')
        .map((segment) => segment.trim())
        .filter(Boolean)
        .map((fileName) => ({ name: fileName }));
    }
    return [];
  }, [files, value]);

  const totalBytes = fileItems.reduce((total, item) => total + (item.size ?? 0), 0);

  return (
    <Modal
      open
      onClose={onClose}
      title={
        <div className="playground-file-modal__title-wrap">
          <span className="playground-file-modal__param-name">{name || '文件参数'}</span>
          <span className="playground-file-modal__badge">
            {multiple ? '多文件上传' : '单文件上传'}
          </span>
        </div>
      }
      size="medium"
      className="playground-file-modal"
      footer={
        <>
          <span className="ui-modal__footer-note">
            {fileItems.length > 0 ? (
              <>
                共 <strong>{fileItems.length}</strong> 个文件
                {totalBytes > 0 ? ` · 合计 ${formatBytes(totalBytes)}` : ''}
              </>
            ) : (
              '未选择文件'
            )}
          </span>
          <button className="is-primary" onClick={onClose} type="button">
            关闭
          </button>
        </>
      }
    >
      {fileItems.length === 0 ? (
        <div className="playground-file-modal__empty">
          <div className="playground-file-modal__empty-icon">
            <IconFile aria-hidden="true" size={32} stroke={1.5} />
          </div>
          <p className="playground-file-modal__empty-title">尚未选择文件</p>
          <p className="playground-file-modal__empty-desc">
            请在参数表格中点击“{multiple ? '选择多个文件' : '选择文件'}”进行上传
          </p>
        </div>
      ) : (
        <div className="playground-file-modal__list">
          {fileItems.map((file, index) => (
            <div className="playground-file-modal__item" key={`${file.name}-${index}`}>
              <div className="playground-file-modal__item-icon">
                <IconFile aria-hidden="true" size={20} stroke={1.6} />
              </div>
              <div className="playground-file-modal__item-content">
                <div className="playground-file-modal__item-name" title={file.name}>
                  {file.name}
                </div>
                <div className="playground-file-modal__item-tags">
                  {file.size !== undefined && (
                    <span className="playground-file-modal__item-size">
                      {formatBytes(file.size)}
                    </span>
                  )}
                  {file.type ? (
                    <span className="playground-file-modal__item-type" title={file.type}>
                      {file.type}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

/**
 * Formats one description with enum extension meanings for the table and tooltip.
 *
 * @param row Parameter row containing OpenAPI description and enum items.
 * @returns A compact description such as “角色状态 (1 - 启用, 2 - 禁用)”.
 */
const getDescription = (row: PlaygroundFieldRow) =>
  [
    row.description?.trim(),
    row.enumItems?.length
      ? `(${row.enumItems
          .map((item) =>
            item.description ? `${item.value} - ${item.description}` : String(item.value),
          )
          .join(', ')})`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

/**
 * Shows the global hover tooltip only when a table description is truncated.
 * @param props Parameter name and complete description including enum meanings.
 * @returns A description with hover and focus explanations enabled only on overflow.
 */
function ParameterDescription({ name, description }: { name: string; description: string }) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element) return;
    /**
     * Updates whether the rendered description exceeds the available column width.
     * @param None; reads the current description element.
     * @returns Nothing; updates the description trigger state.
     */
    const measure = () => setOverflowing(element.scrollWidth > element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [description]);

  return (
    <Tooltip
      className="playground-fields__description-hint"
      content={description}
      disabled={!overflowing}
    >
      <span
        aria-label={overflowing ? `${name || '参数'}的描述` : undefined}
        className="playground-fields__description"
        ref={textRef}
        tabIndex={overflowing ? 0 : undefined}
      >
        {description || '—'}
      </span>
    </Tooltip>
  );
}

/**
 * Renders Path, Query, form, Header and Cookie fields with one compact table language.
 *
 * @param props Rows, source metadata and callbacks for editing the owning state.
 * @returns A table with enum selectors, full-value editing, source labels and optional MIME fields.
 */
export function PlaygroundFields({
  allowContentType = false,
  headerNames = false,
  hideMetadata = false,
  onAdd,
  onFileChange,
  onRemove,
  onToggleAll,
  onUpdate,
  rows,
}: PlaygroundFieldsProps) {
  const [editing, setEditing] = useState<string>();
  const tableRef = useRef<HTMLDivElement>(null);
  useMovingHighlight(tableRef, 'tbody > tr[data-motion-row]');
  useListMotion(tableRef, 'tbody > tr[data-motion-row]', rows.map((row) => row.id).join('|'));
  const [draft, setDraft] = useState({ name: '', value: '' });
  const inputRefs = useRef(new Map<string, HTMLInputElement>());
  const pendingFocusRef = useRef<{ id: string; field: 'name' | 'value'; cursor: number } | null>(
    null,
  );
  const composingRef = useRef(false);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const editableRows = rows.filter((row) => !row.locked && !(row.required && !row.inherited));
  const enabledEditableCount = editableRows.filter((row) => row.item.enabled).length;

  useLayoutEffect(() => {
    const pending = pendingFocusRef.current;
    if (!pending) return;
    const input = inputRefs.current.get(`${pending.id}:${pending.field}`);
    if (!input) return;
    input.focus({ preventScroll: true });
    input.setSelectionRange(pending.cursor, pending.cursor);
    pendingFocusRef.current = null;
  }, [rows]);

  /**
   * Turns the permanent empty row into a parameter while keeping the caret in the edited field.
   * @param field Name or value currently being edited.
   * @param value Current text, including completed input-method composition.
   * @param cursor Caret position to restore in the newly created row.
   * @returns Nothing; creates a row only after non-blank text is entered.
   */
  const commitDraft = (field: 'name' | 'value', value: string, cursor: number) => {
    if (!onAdd || pendingFocusRef.current) return;
    const next = { ...draft, [field]: value };
    if (!value.trim() || composingRef.current) {
      setDraft(next);
      return;
    }
    const id = onAdd({
      ...next,
      enabled: true,
      ...(allowContentType ? { contentType: 'text/plain' } : {}),
    });
    pendingFocusRef.current = { id, field, cursor };
    setDraft({ name: '', value: '' });
  };

  useLayoutEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        enabledEditableCount > 0 && enabledEditableCount < editableRows.length;
    }
  }, [editableRows.length, enabledEditableCount]);

  /**
   * Checks whether a global or authentication row is replaced by a higher-priority value.
   *
   * @param row Parameter row and its authentication collision metadata.
   * @returns True when the effective request uses another value with the same name.
   */
  const isOverridden = (row: PlaygroundFieldRow) => {
    if (row.overridden) return true;
    if (row.source === '接口') return false;
    return rows.some(
      (candidate) =>
        candidate !== row &&
        (candidate.source === '接口' || (row.source === '认证' && candidate.source === '全局')) &&
        candidate.item.enabled &&
        (row.source !== '认证' || Boolean(candidate.item.value.trim())) &&
        (headerNames ? candidate.item.name.trim().toLowerCase() : candidate.item.name.trim()) ===
          (headerNames ? row.item.name.trim().toLowerCase() : row.item.name.trim()),
    );
  };

  const activeRow = rows.find((row) => row.id === editing);

  return (
    <>
      <div className="playground-fields-scroll rare-moving-fields rare-moving-table" ref={tableRef}>
        <table
          className={[
            'playground-fields',
            allowContentType ? 'has-content-type' : '',
            hideMetadata ? 'hide-metadata' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <colgroup>
            <col className="is-check" />
            <col className="is-name" />
            <col className="is-value" />
            {allowContentType && <col className="is-content-type" />}
            <col className="is-description" />
            {!allowContentType && !hideMetadata && <col className="is-metadata" />}
            <col className="is-delete" />
          </colgroup>
          <thead>
            <tr>
              <th data-column="check">
                <input
                  aria-label="启用全部可选参数"
                  checked={
                    editableRows.length > 0
                      ? enabledEditableCount === editableRows.length
                      : rows.length > 0 && rows.every((row) => row.item.enabled)
                  }
                  disabled={!rows.length}
                  aria-disabled={!editableRows.length || undefined}
                  onClick={(event) => {
                    if (!editableRows.length) event.preventDefault();
                  }}
                  onChange={(event) => {
                    if (!editableRows.length) return;
                    if (onToggleAll)
                      onToggleAll(
                        event.target.checked,
                        editableRows.map((row) => row.id),
                      );
                    else
                      editableRows.forEach((row) =>
                        onUpdate(row.id, { enabled: event.target.checked }),
                      );
                  }}
                  ref={selectAllRef}
                  type="checkbox"
                />
              </th>
              <th data-column="name">参数名</th>
              <th data-column="value">参数值</th>
              {allowContentType && <th data-column="content-type">内容类型</th>}
              <th data-column="description">描述</th>
              {!allowContentType && !hideMetadata && <th data-column="metadata">属性</th>}
              <th data-column="delete" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const description = getDescription(row);
              const overridden = isOverridden(row);
              return (
                <tr
                  className={!row.item.enabled || overridden ? 'is-disabled' : undefined}
                  key={row.id}
                  data-motion-row={row.id}
                >
                  <td data-column="check">
                    <input
                      aria-label={`启用 ${row.item.name || '参数'}`}
                      checked={row.item.enabled}
                      aria-disabled={row.locked || (row.required && !row.inherited) || undefined}
                      onClick={(event) => {
                        if (row.locked || (row.required && !row.inherited)) event.preventDefault();
                      }}
                      onChange={(event) => {
                        if (!row.locked && !(row.required && !row.inherited))
                          onUpdate(row.id, { enabled: event.target.checked });
                      }}
                      tabIndex={row.locked || (row.required && !row.inherited) ? -1 : undefined}
                      type="checkbox"
                    />
                  </td>
                  <td data-column="name" data-label="参数名">
                    <div className="playground-fields__name-wrap">
                      <Input
                        aria-label="参数名"
                        className="playground-fields__name"
                        onChange={(event) => onUpdate(row.id, { name: event.target.value })}
                        placeholder="参数名"
                        readOnly={row.locked || row.nameLocked || row.required}
                        ref={(element) => {
                          if (element) inputRefs.current.set(`${row.id}:name`, element);
                          else inputRefs.current.delete(`${row.id}:name`);
                        }}
                        value={row.item.name}
                      />
                      {(allowContentType || hideMetadata) && row.required && (
                        <span
                          className="playground-fields__required-star"
                          title="必选参数"
                          aria-label="必选"
                        >
                          *
                        </span>
                      )}
                    </div>
                  </td>
                  <td data-column="value" data-label="参数值">
                    <div className="playground-fields__value ui-input-shell">
                      {row.fileField ? (
                        <label>
                          <IconFile aria-hidden="true" size={13} />
                          <span title={row.item.value}>
                            {row.item.value || (row.multiple ? '选择多个文件' : '选择文件')}
                          </span>
                          <input
                            aria-label={`${row.item.name || '参数'}文件`}
                            multiple={row.multiple}
                            onChange={(event) =>
                              onFileChange?.(row.id, Array.from(event.target.files ?? []))
                            }
                            type="file"
                          />
                        </label>
                      ) : row.enumItems?.length ? (
                        <SelectMenu
                          ariaLabel={`${row.item.name || '参数'}枚举值`}
                          className="playground-fields__enum"
                          disabled={row.locked}
                          onChange={(value) => onUpdate(row.id, { value })}
                          options={[
                            ...(!row.enumItems.some((item) => String(item.value) === row.item.value)
                              ? [{ label: row.item.value || '请选择', value: row.item.value }]
                              : []),
                            ...row.enumItems.map((item) => ({
                              label: `${item.value}${item.description ? ` - ${item.description}` : ''}`,
                              value: String(item.value),
                            })),
                          ]}
                          value={row.item.value}
                        />
                      ) : (
                        <Input
                          variant="embedded"
                          aria-label={`${row.item.name || '参数'}参数值`}
                          onChange={(event) => onUpdate(row.id, { value: event.target.value })}
                          placeholder={row.placeholder || '输入值'}
                          readOnly={row.locked}
                          ref={(element) => {
                            if (element) inputRefs.current.set(`${row.id}:value`, element);
                            else inputRefs.current.delete(`${row.id}:value`);
                          }}
                          value={row.item.value}
                        />
                      )}
                      <button
                        aria-label={
                          row.fileField
                            ? `查看 ${row.item.name || '参数'}已选文件`
                            : `放大编辑 ${row.item.name || '参数值'}`
                        }
                        disabled={row.locked}
                        onClick={() => setEditing(row.id)}
                        title={row.fileField ? '查看已选文件' : '放大编辑'}
                        type="button"
                      >
                        <IconMaximize aria-hidden="true" size={12} />
                      </button>
                    </div>
                  </td>
                  {allowContentType && (
                    <td data-column="content-type" data-label="内容类型">
                      <SelectMenu
                        ariaLabel={`${row.item.name || '参数'}内容类型`}
                        className="playground-fields__content-type"
                        clearable
                        editable
                        disabled={row.locked}
                        onChange={(contentType) => onUpdate(row.id, { contentType })}
                        options={commonContentTypes.map((value) => ({ label: value, value }))}
                        placeholder="选择或输入类型"
                        value={row.item.contentType ?? row.contentType ?? ''}
                      />
                    </td>
                  )}
                  <td data-column="description" data-label="描述">
                    <ParameterDescription name={row.item.name} description={description} />
                  </td>
                  {!allowContentType && !hideMetadata && (
                    <td data-column="metadata" data-label="属性">
                      <div className="playground-fields__markers">
                        <span className={`is-${row.source}`}>{row.source}</span>
                        {row.sessionState && (
                          <Tooltip
                            className={
                              row.sessionState === '已覆盖'
                                ? 'is-session-override'
                                : row.sessionState === '已禁用'
                                  ? 'is-session-disabled'
                                  : undefined
                            }
                            content={
                              row.sessionState === '继承'
                                ? '跟随当前全局值；编辑或切换启用状态只影响本次调试'
                                : '仅影响当前调试会话，可通过右侧按钮恢复继承'
                            }
                          >
                            <span>{row.sessionState}</span>
                          </Tooltip>
                        )}
                        {row.required && (
                          <span className="is-required" title="必填" aria-label="必填">
                            *
                          </span>
                        )}
                        {overridden && (
                          <span
                            className="is-overridden"
                            title="同名参数已被更高优先级的值覆盖"
                            aria-label="已覆盖"
                          >
                            覆
                          </span>
                        )}
                      </div>
                    </td>
                  )}
                  <td data-column="delete">
                    {row.inherited ? (
                      <Tooltip content="清除本次覆盖，恢复当前全局值">
                        <button
                          aria-label={`恢复继承 ${row.item.name}`}
                          className="playground-fields__delete"
                          disabled={!row.onRestore}
                          onClick={row.onRestore}
                          type="button"
                        >
                          <IconRestore aria-hidden="true" size={14} stroke={1.8} />
                        </button>
                      </Tooltip>
                    ) : (
                      <DeleteButton
                        compact
                        label={`删除 ${row.item.name || '参数'}`}
                        description="此调试参数将被移除。"
                        className="playground-fields__delete"
                        disabled={!onRemove || row.locked || row.removeLocked || row.required}
                        onConfirm={() => onRemove?.(row.id)}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
            {onAdd && (
              <tr className="playground-fields__draft" data-motion-row="draft">
                <td data-column="check">
                  <input aria-label="新参数默认启用" checked disabled type="checkbox" />
                </td>
                {(['name', 'value'] as const).map((field) => (
                  <td
                    data-column={field}
                    data-label={field === 'name' ? '参数名' : '参数值'}
                    key={field}
                  >
                    <Input
                      aria-label={field === 'name' ? '新增参数名' : '新增参数值'}
                      onChange={(event) =>
                        commitDraft(
                          field,
                          event.target.value,
                          event.target.selectionStart ?? event.target.value.length,
                        )
                      }
                      onCompositionStart={() => {
                        composingRef.current = true;
                      }}
                      onCompositionEnd={(event) => {
                        composingRef.current = false;
                        commitDraft(
                          field,
                          event.currentTarget.value,
                          event.currentTarget.selectionStart ?? event.currentTarget.value.length,
                        );
                      }}
                      placeholder={field === 'name' ? '输入名称以添加' : '参数值'}
                      value={draft[field]}
                    />
                  </td>
                ))}
                {allowContentType && <td data-column="content-type" />}
                <td data-column="description" />
                {!allowContentType && !hideMetadata && <td data-column="metadata" />}
                <td data-column="delete" />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {activeRow &&
        (activeRow.fileField ? (
          <FileListDialog
            key={activeRow.id}
            files={activeRow.files}
            multiple={activeRow.multiple}
            name={activeRow.item.name}
            onClose={() => setEditing(undefined)}
            value={activeRow.item.value}
          />
        ) : (
          <LongValueDialog
            key={activeRow.id}
            name={activeRow.item.name}
            onClose={() => setEditing(undefined)}
            onSave={(value) => onUpdate(activeRow.id, { value })}
            value={activeRow.item.value}
          />
        ))}
    </>
  );
}
