import { AnimatedDetails } from '../../components/rare-ui/height-transition';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  IconAlertTriangle,
  IconCheck,
  IconCopy,
  IconDatabase,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { Modal } from '../../components/modal';
import { Tooltip } from '../../components/tooltip';
import { SelectMenu, type SelectMenuOption } from '../../components/select-menu';
import type { ApiOperation } from '../../types/openapi';
import { WorkflowStepPanel } from './workflow-step-panel';
import {
  createWorkflowStep,
  workflowStepLabels,
  type PrePostPhase,
  type PrePostPhaseConfig,
  type WorkflowStep,
  type WorkflowStepType,
} from './pre-post-types';

interface Props {
  availableOperations?: ApiOperation[];
  config: PrePostPhaseConfig;
  pathOptions?: { request: SelectMenuOption[]; response: SelectMenuOption[] };
  securityOptions?: SelectMenuOption[];
  precedingSteps?: WorkflowStep[];
  onChange: (config: PrePostPhaseConfig) => void;
  phase: PrePostPhase;
  busy?: boolean;
  onRunStep?: (step: WorkflowStep) => void;
  flow?: Record<string, unknown>;
  results?: Record<string, unknown>;
  onFlowChange?: (name: string, value: unknown) => void;
  onResetFlow?: () => void;
}

/** Displays a cached value as readable scalar text or expandable key/value pairs.
 * @param props Value to display and ancestor objects used to detect circular references.
 * @returns A typed value without exposing the cache as a JSON document.
 */
function FlowValue({ value, ancestors = [] }: { value: unknown; ancestors?: object[] }) {
  const [copied, setCopied] = useState(false);

  /** Copies one flow value and reports success only after a successful write.
   * @param event Click event whose propagation is stopped before copying.
   * @returns Completion after clipboard write or a handled failure.
   */
  const handleCopy = async (event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      let text: string;
      if (typeof value === 'object' && value !== null) {
        text = JSON.stringify(
          value,
          (_key, val) => (typeof val === 'bigint' ? val.toString() : val),
          2,
        );
      } else {
        text = String(value ?? '');
      }

      if (!navigator.clipboard?.writeText) {
        const container = document.querySelector('dialog[open]') ?? document.body;
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.top = '0';
        textarea.style.left = '0';
        textarea.style.opacity = '0';
        textarea.style.pointerEvents = 'none';
        container.appendChild(textarea);
        try {
          textarea.focus();
          textarea.select();
          const success = document.execCommand('copy');
          if (!success) return;
        } finally {
          textarea.remove();
        }
      } else {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Gracefully handle serialization errors (e.g. circular structures) and clipboard rejections
    }
  };

  if (value !== null && typeof value === 'object') {
    if (ancestors.includes(value)) return <span className="workflow-cache-muted">循环引用</span>;
    if (value instanceof Date) return <span className="workflow-cache-value">{String(value)}</span>;
    const entries = Object.entries(value);
    return (
      <AnimatedDetails
        className="workflow-cache-object"
        unmountOnExit
        summary={
          <>
            <span className="workflow-cache-type is-object">
              {Array.isArray(value) ? '数组' : '对象'}
            </span>
            <span className="workflow-cache-count-label">{entries.length} 项</span>
            <button
              type="button"
              className="workflow-cache-copy-btn"
              title={copied ? '已复制' : '复制 JSON'}
              aria-label={copied ? '已复制' : '复制内容'}
              onClick={handleCopy}
            >
              {copied ? <IconCheck size={12} stroke={2.2} /> : <IconCopy size={12} />}
            </button>
          </>
        }
      >
        <dl>
          {entries.map(([key, item]) => (
            <div className="workflow-cache-pair" key={key}>
              <dt>{key}</dt>
              <dd>
                <FlowValue value={item} ancestors={[...ancestors, value]} />
              </dd>
            </div>
          ))}
        </dl>
      </AnimatedDetails>
    );
  }
  const typeKind =
    value === null
      ? 'null'
      : typeof value === 'boolean'
        ? 'boolean'
        : typeof value === 'number'
          ? 'number'
          : typeof value === 'string'
            ? 'string'
            : typeof value;
  const typeLabel =
    value === null
      ? 'null'
      : ((
          {
            string: '文本',
            number: '数字',
            boolean: '布尔',
            undefined: '未定义',
            bigint: '整数',
          } as Record<string, string>
        )[typeof value] ?? typeof value);
  return (
    <span className="workflow-cache-scalar">
      <span className={`workflow-cache-type is-${typeKind}`}>{typeLabel}</span>
      <span className="workflow-cache-value">
        {value === '' ? <span className="workflow-cache-muted">空文本</span> : String(value)}
      </span>
      <button
        type="button"
        className="workflow-cache-copy-btn"
        title={copied ? '已复制' : '复制值'}
        aria-label={copied ? '已复制' : '复制内容'}
        onClick={handleCopy}
      >
        {copied ? <IconCheck size={12} stroke={2.2} /> : <IconCopy size={12} />}
      </button>
    </span>
  );
}

export function PrePostOperationPanel({
  availableOperations = [],
  config,
  pathOptions,
  securityOptions = [],
  precedingSteps = [],
  onChange,
  phase,
  busy = false,
  onRunStep,
  flow = {},
  results = {},
  onFlowChange,
  onResetFlow,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const clearBtnRef = useRef<HTMLButtonElement>(null);
  const popconfirmRef = useRef<HTMLDivElement>(null);
  const addedStepRef = useRef<string | undefined>(undefined);
  const [showReset, setShowReset] = useState(false);
  const [showFlow, setShowFlow] = useState(false);
  const [confirmResetFlow, setConfirmResetFlow] = useState(false);
  const [flowName, setFlowName] = useState('');
  const [flowValue, setFlowValue] = useState('');
  const [popconfirmPos, setPopconfirmPos] = useState<{
    left: number;
    top?: number;
    bottom?: number;
  }>();
  const flowEntries = Object.entries(flow);
  const hasFlowData = flowEntries.length > 0 || Object.keys(results).length > 0;
  const types = Object.entries(workflowStepLabels).filter(
    ([type]) => phase === 'pre-request' || !['write', 'input'].includes(type),
  );

  /** Places the clear confirmation inside the viewport next to its trigger.
   * @param None; reads the clear-button element.
   * @returns Nothing; updates the floating confirmation coordinates.
   */
  const updatePopconfirmPos = useCallback(() => {
    if (!clearBtnRef.current) return;
    const rect = clearBtnRef.current.getBoundingClientRect();
    const width = 236;
    const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
    const spaceAbove = rect.top - 8;
    const showAbove = spaceAbove >= 115;
    setPopconfirmPos({
      left,
      top: showAbove ? undefined : rect.bottom + 8,
      bottom: showAbove ? window.innerHeight - rect.top + 8 : undefined,
    });
  }, []);

  useEffect(() => {
    if (!showReset) return;
    updatePopconfirmPos();
    /** Repositions an open confirmation after viewport movement.
     * @param None; reads the current trigger bounds.
     * @returns Nothing; updates its position.
     */
    const handleViewportChange = () => updatePopconfirmPos();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [showReset, updatePopconfirmPos]);

  useEffect(() => {
    if (!showReset) return;
    /** Dismisses confirmation after clicking outside it and its trigger.
     * @param event Pointer event from the document.
     * @returns Nothing; closes an outside confirmation.
     */
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (clearBtnRef.current?.contains(target) || popconfirmRef.current?.contains(target)) return;
      setShowReset(false);
    };
    /** Dismisses the clear confirmation with Escape.
     * @param event Keyboard event from the window.
     * @returns Nothing; closes confirmation when Escape is pressed.
     */
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowReset(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showReset]);

  /** Appends a generic operation and reveals it after rendering.
   * @param type Operation selected by the user.
   * @returns Nothing; updates the configured step list.
   */
  const addStep = (type: WorkflowStepType) => {
    const step = createWorkflowStep(type, phase);
    addedStepRef.current = step.id;
    onChange({ steps: [...config.steps, step] });
  };
  useEffect(() => {
    const id = addedStepRef.current;
    if (!id) return;
    const card = [
      ...(panelRef.current?.querySelectorAll<HTMLElement>('[data-workflow-step-id]') ?? []),
    ].find((item) => item.dataset.workflowStepId === id);
    if (card) {
      card.scrollIntoView?.({ block: 'nearest' });
      addedStepRef.current = undefined;
    }
  }, [config.steps]);
  return (
    <div className="pre-post-panel" ref={panelRef}>
      <div className="pre-post-subtoolbar">
        <span className="pre-post-script-title">
          {phase === 'pre-request' ? '发送前执行' : '收到响应后执行'}
        </span>
        <div className="pre-post-subtoolbar__right">
          <SelectMenu
            ariaLabel="添加步骤"
            className="pre-post-add-menu"
            selectedLabel="添加步骤"
            value=""
            disabled={busy}
            options={types.map(([value, label]) => ({ value, label }))}
            onChange={(type) => addStep(type as WorkflowStepType)}
          />
          <Tooltip
            placement="bottom"
            content={`流程变量缓存 · ${flowEntries.length} 项，当前服务共享，刷新后清除`}
            disabled={showFlow}
          >
            <button
              className="pre-post-cache-btn"
              type="button"
              aria-label="流程变量缓存"
              aria-haspopup="dialog"
              aria-expanded={showFlow}
              onClick={() => {
                setShowFlow(true);
                setConfirmResetFlow(false);
              }}
            >
              <IconDatabase aria-hidden="true" size={16} />
              {flowEntries.length > 0 && (
                <span className="pre-post-cache-count">
                  {flowEntries.length > 99 ? '99+' : flowEntries.length}
                </span>
              )}
            </button>
          </Tooltip>
          <div className="pre-post-clear-wrap">
            <Tooltip placement="bottom" content="清空当前阶段的步骤" disabled={showReset}>
              <button
                className="pre-post-clear-btn"
                type="button"
                aria-label="清空当前流程"
                disabled={busy || !config.steps.length}
                onClick={() => setShowReset((prev) => !prev)}
                ref={clearBtnRef}
              >
                <IconTrash size={15} />
              </button>
            </Tooltip>
            {showReset &&
              popconfirmPos &&
              createPortal(
                <div
                  className={`workflow-popconfirm ${popconfirmPos.top !== undefined ? 'is-below' : 'is-above'}`}
                  ref={popconfirmRef}
                  role="dialog"
                  aria-label="确认清空当前流程"
                  style={{
                    left: popconfirmPos.left,
                    top: popconfirmPos.top,
                    bottom: popconfirmPos.bottom,
                  }}
                >
                  <div className="workflow-popconfirm__arrow" />
                  <div className="workflow-popconfirm__content">
                    <IconAlertTriangle
                      aria-hidden="true"
                      className="workflow-popconfirm__icon"
                      size={16}
                    />
                    <div className="workflow-popconfirm__text">
                      <strong>确认清空步骤？</strong>
                      <p>将删除当前阶段的所有步骤配置，此操作无法撤销。</p>
                    </div>
                  </div>
                  <div className="workflow-popconfirm__actions">
                    <button
                      type="button"
                      className="workflow-popconfirm__btn"
                      onClick={() => setShowReset(false)}
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      className="workflow-popconfirm__btn is-danger"
                      disabled={busy}
                      onClick={() => {
                        setShowReset(false);
                        onChange({ steps: [] });
                      }}
                    >
                      确认清空
                    </button>
                  </div>
                </div>,
                document.body,
              )}
          </div>
        </div>
      </div>
      <WorkflowStepPanel
        availableOperations={availableOperations}
        config={config}
        pathOptions={pathOptions}
        securityOptions={securityOptions}
        precedingSteps={precedingSteps}
        phase={phase}
        onChange={onChange}
        busy={busy}
        onRunStep={onRunStep}
        results={results}
        flow={flow}
        onFlowChange={onFlowChange}
      />
      <Modal
        open={showFlow}
        onClose={() => {
          setShowFlow(false);
          setConfirmResetFlow(false);
        }}
        title={
          <span className="workflow-cache-title">
            <span className="workflow-cache-icon-badge">
              <IconDatabase aria-hidden="true" size={16} />
            </span>
            <span>流程变量</span>
            <span className="workflow-cache-pill">{flowEntries.length} 项</span>
          </span>
        }
        description="当前服务内共享，刷新页面后清除。"
        className="workflow-cache-dialog"
        footer={
          confirmResetFlow ? (
            <>
              <span className="ui-modal__footer-note">
                清空变量和手动步骤结果？步骤配置将保留。
              </span>
              <button type="button" onClick={() => setConfirmResetFlow(false)}>
                取消
              </button>
              <button
                type="button"
                className="workflow-cache-danger"
                disabled={busy || !onResetFlow}
                onClick={() => {
                  onResetFlow?.();
                  setConfirmResetFlow(false);
                  setFlowName('');
                  setFlowValue('');
                }}
              >
                确认清空
              </button>
            </>
          ) : (
            <>
              <button
                className="workflow-cache-reset"
                type="button"
                disabled={busy || !hasFlowData || !onResetFlow}
                onClick={() => setConfirmResetFlow(true)}
              >
                <IconTrash aria-hidden="true" size={14} />
                清空缓存
              </button>
              <button className="is-primary" type="button" onClick={() => setShowFlow(false)}>
                完成
              </button>
            </>
          )
        }
      >
        {flowEntries.length ? (
          <div className="workflow-cache-table-wrap">
            <table className="workflow-cache-table">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '32%' }}>
                    变量名
                  </th>
                  <th scope="col">变量值</th>
                </tr>
              </thead>
              <tbody>
                {flowEntries.map(([name, value]) => (
                  <tr key={name}>
                    <th scope="row">
                      <span className="workflow-cache-var-name">{name}</span>
                    </th>
                    <td>
                      <FlowValue value={value} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="workflow-cache-empty">
            <div className="workflow-cache-empty-icon">
              <IconDatabase aria-hidden="true" size={24} stroke={1.5} />
            </div>
            <strong>暂无流程变量</strong>
            <span>步骤保存的变量会显示在这里，也可以在下方手动添加。</span>
          </div>
        )}
        <form
          className="workflow-cache-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (
              busy ||
              !onFlowChange ||
              !flowName.trim() ||
              ['__proto__', 'constructor', 'prototype'].includes(flowName.trim())
            )
              return;
            onFlowChange(flowName.trim(), flowValue);
            setFlowName('');
            setFlowValue('');
          }}
        >
          <span className="workflow-cache-form-title">新增 / 更新文本变量</span>
          <label>
            <span>变量名</span>
            <input
              className="ui-input"
              aria-label="流程变量名"
              placeholder="例如 token / orderId"
              value={flowName}
              disabled={busy || !onFlowChange}
              onChange={(event) => setFlowName(event.target.value)}
            />
          </label>
          <label>
            <span>变量值</span>
            <input
              className="ui-input"
              aria-label="流程变量值"
              placeholder="输入文本值"
              value={flowValue}
              disabled={busy || !onFlowChange}
              onChange={(event) => setFlowValue(event.target.value)}
            />
          </label>
          <button
            className="workflow-cache-save-btn"
            type="submit"
            disabled={
              busy ||
              !onFlowChange ||
              !flowName.trim() ||
              ['__proto__', 'constructor', 'prototype'].includes(flowName.trim())
            }
          >
            <IconPlus aria-hidden="true" size={14} />
            保存
          </button>
        </form>
      </Modal>
    </div>
  );
}
