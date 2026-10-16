import { DeleteButton } from '../../components/rare-ui/delete-button';
import { useMemo, useRef, useState } from 'react';
import { useListMotion } from '../../components/rare-ui/use-list-motion';
import { HeightTransition, AnimatedDetails } from '../../components/rare-ui/height-transition';
import { CodeEditor } from '../../components/code-editor';
import { IconArrowDown, IconArrowUp, IconChevronDown } from '@tabler/icons-react';
import { SelectMenu, type SelectMenuOption } from '../../components/select-menu';
import { SwitchControl } from '../../components/switch-control';
import type { ApiOperation } from '../../types/openapi';
import { methodColor } from '../openapi/utils';
import {
  canRunWorkflowStepManually,
  workflowStepLabels as labels,
  workflowTransformOptions,
} from './pre-post-types';
import type { PrePostPhase, PrePostPhaseConfig, WorkflowStep } from './pre-post-types';
import { getWorkflowPathOptions } from './workflow-path-options';

interface Props {
  availableOperations: ApiOperation[];
  config: PrePostPhaseConfig;
  pathOptions?: { request: SelectMenuOption[]; response: SelectMenuOption[] };
  onChange: (config: PrePostPhaseConfig) => void;
  phase: PrePostPhase;
  securityOptions?: SelectMenuOption[];
  precedingSteps?: WorkflowStep[];
  busy?: boolean;
  onRunStep?: (step: WorkflowStep) => void;
  results?: Record<string, unknown>;
  flow?: Record<string, unknown>;
  onFlowChange?: (name: string, value: unknown) => void;
}
/** Converts workflow choices to menu options.
 * @param items Value and display-label pairs.
 * @returns Options in the supplied order.
 */
const options = (items: Array<[string, string]>): SelectMenuOption[] =>
  items.map(([value, label]) => ({ value, label }));

const fieldLabels: Partial<Record<keyof WorkflowStep, string>> = {
  source: '读取来源',
  sourcePart: '读取位置',
  targetType: '写入目标',
  failurePolicy: '失败处理',
  trigger: '执行方式',
  scope: '变量作用域',
  algorithm: '转换方式',
  method: '请求方法',
  requestBodyKind: 'Body 类型',
  targetField: '目标认证方案',
  operator: '校验条件',
};
const fieldDefaults: Partial<WorkflowStep> = {
  trigger: 'auto',
  scope: 'run',
  sourcePart: 'body',
  requestBodyKind: 'auto',
  method: 'GET',
  algorithm: 'base64',
};

export function WorkflowStepPanel({
  availableOperations,
  config,
  onChange,
  phase,
  pathOptions,
  securityOptions = [],
  precedingSteps = [],
  busy = false,
  onRunStep,
  results = {},
  flow = {},
  onFlowChange,
}: Props) {
  const steps = config.steps;
  const listRef = useRef<HTMLDivElement>(null);
  useListMotion(listRef, ':scope > [data-motion-row]', steps.map((step) => step.id).join('|'));
  const operationOptions = useMemo(
    () =>
      availableOperations.map((operation) => ({
        value: `${operation.method.toUpperCase()} ${operation.path}`,
        label: operation.path,
        tag: operation.method.toUpperCase(),
        tagColor: methodColor(operation.method),
        description: operation.summary,
      })),
    [availableOperations],
  );
  const [collapsedSteps, setCollapsedSteps] = useState<Record<string, boolean>>({});

  /** Toggles the collapsed state of a step card.
   * @param id Step identity.
   * @returns Nothing; updates the collapsed state.
   */
  const toggleCollapse = (id: string) =>
    setCollapsedSteps((prev) => ({ ...prev, [id]: !prev[id] }));

  /** Updates the selected step and keeps request-dependent writes automatic.
   * @param id Step identity.
   * @param patch Changed configuration fields.
   * @returns Nothing; publishes the next configuration.
   */
  const update = (id: string, patch: Partial<WorkflowStep>) =>
    onChange({
      ...config,
      steps: steps.map((step) => {
        if (step.id !== id) return step;
        const next = { ...step, ...patch };
        if (
          (patch.targetType !== undefined || patch.writeBack !== undefined) &&
          next.trigger === 'manual' &&
          !canRunWorkflowStepManually(next)
        )
          next.trigger = 'auto';
        return next;
      }),
    });
  /** Moves a step within the current phase.
   * @param index Current position.
   * @param delta Relative position change.
   * @returns Nothing; ignores moves outside the list.
   */
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...config, steps: next });
  };
  /** Removes a configured step.
   * @param id Step identity.
   * @returns Nothing; publishes the remaining steps.
   */
  const remove = (id: string) =>
    onChange({ ...config, steps: steps.filter((step) => step.id !== id) });
  /** Renders a choice field and resets dependent source settings when needed.
   * @param step Step being edited.
   * @param field Configuration field to update.
   * @param list Available choices.
   * @returns The controlled menu.
   */
  const select = (step: WorkflowStep, field: keyof WorkflowStep, list: SelectMenuOption[]) => (
    <SelectMenu
      ariaLabel={fieldLabels[field] ?? String(field)}
      className="workflow-step-select"
      disabled={busy}
      options={list}
      value={String(step[field] ?? fieldDefaults[field] ?? '')}
      onChange={(value) =>
        update(
          step.id,
          field === 'source'
            ? {
                source: value as WorkflowStep['source'],
                path: '',
                sourcePart: 'body',
                resultStepId: undefined,
                writeBack: value === 'request' ? step.writeBack : false,
              }
            : field === 'sourcePart'
              ? {
                  sourcePart: value as WorkflowStep['sourcePart'],
                  path: '',
                  writeBack: value === 'body' ? step.writeBack : false,
                }
              : field === 'targetType'
                ? { targetType: value as WorkflowStep['targetType'], targetField: '' }
                : ({ [field]: value } as Partial<WorkflowStep>),
        )
      }
    />
  );
  /**
   * Renders a step input, offering documented fields for request and response paths.
   * @param step Step receiving the selected or typed value.
   * @param field Editable step field.
   * @param placeholder Hint used when no value is entered.
   * @returns An editable field selector or a plain input for other values.
   */
  const input = (
    step: WorkflowStep,
    field:
      | 'path'
      | 'value'
      | 'saveAs'
      | 'key'
      | 'iv'
      | 'targetField'
      | 'expectedValue'
      | 'endpoint'
      | 'requestBody'
      | 'requestHeaders'
      | 'previewPath',
    placeholder: string,
  ) =>
    (field === 'targetField' && step.type === 'write' && step.targetType === 'body') ||
    (field === 'path' &&
      (step.source === 'request' ||
        step.source === 'response' ||
        step.source === 'variable' ||
        step.source === 'flow' ||
        step.source === 'result')) ? (
      <SelectMenu
        ariaLabel={field === 'targetField' ? '目标字段路径' : '路径 / 输入'}
        disabled={busy}
        className="workflow-step-select"
        editable
        options={
          field === 'targetField'
            ? (pathOptions?.request ?? [])
            : step.source === 'result'
              ? getWorkflowPathOptions({}, {}, results[step.resultStepId ?? ''])
              : step.source === 'variable'
                ? [
                    ...new Map(
                      [...precedingSteps, ...steps.slice(0, steps.indexOf(step))]
                        .filter(
                          (item) =>
                            step.trigger !== 'manual' &&
                            item.enabled &&
                            item.trigger !== 'manual' &&
                            Boolean(item.saveAs) &&
                            item.scope !== 'flow',
                        )
                        .map((item) => {
                          const value = item.saveAs!;
                          return [value, { value, label: `${value} · ${item.name}` }] as const;
                        }),
                    ).values(),
                  ]
                : step.source === 'flow'
                  ? [
                      ...new Map([
                        ...Object.keys(flow).map(
                          (value) => [value, { value, label: value }] as const,
                        ),
                        ...[...precedingSteps, ...steps.slice(0, steps.indexOf(step))]
                          .filter(
                            (item) => item.enabled && item.scope === 'flow' && Boolean(item.saveAs),
                          )
                          .map(
                            (item) =>
                              [
                                item.saveAs!,
                                { value: item.saveAs!, label: `${item.saveAs} · ${item.name}` },
                              ] as const,
                          ),
                      ]).values(),
                    ]
                  : (step.source === 'request' || step.source === 'response') &&
                      (!step.sourcePart || step.sourcePart === 'body')
                    ? (pathOptions?.[step.source] ?? [])
                    : []
        }
        placeholder={
          field === 'targetField'
            ? '选择目标字段或输入路径，$ 表示整个 JSON'
            : step.source === 'variable'
              ? '选择变量或输入变量路径'
              : step.source === 'flow'
                ? '选择或输入流程变量名'
                : '选择字段或输入路径，$ 表示整体'
        }
        value={String(step[field] ?? '')}
        onChange={(value) => update(step.id, { [field]: value })}
      />
    ) : (
      <input
        className="ui-input"
        disabled={busy}
        aria-label={field === 'value' ? '固定值' : undefined}
        value={String(step[field] ?? '')}
        placeholder={placeholder}
        onChange={(event) => update(step.id, { [field]: event.target.value })}
      />
    );
  return (
    <div className="workflow-step-panel">
      {steps.length === 0 && (
        <div className="workflow-step-empty">还没有步骤，请从右上角添加一个操作。</div>
      )}
      <div className="workflow-step-list" ref={listRef}>
        {steps.map((step, index) => {
          const isCollapsed = Boolean(collapsedSteps[step.id]);
          return (
            <div
              className={`workflow-step-card ${step.enabled ? '' : 'is-disabled'} ${isCollapsed ? 'is-collapsed' : ''}`.trim()}
              key={step.id}
              data-motion-row={step.id}
              data-workflow-step-id={step.id}
            >
              <div
                className="workflow-step-head"
                onClick={(event) => {
                  const target = event.target as HTMLElement | null;
                  if (
                    target?.closest(
                      'button, input, select, textarea, .switch-control, [role="button"], [role="switch"]',
                    )
                  ) {
                    return;
                  }
                  toggleCollapse(step.id);
                }}
              >
                <span className="workflow-step-index">{index + 1}</span>
                <SwitchControl
                  disabled={busy}
                  checked={step.enabled}
                  label={`${step.name}开关`}
                  onChange={(checked) => update(step.id, { enabled: checked })}
                  showState={false}
                />
                <span className="workflow-step-title" title={labels[step.type]}>
                  {step.name || labels[step.type]}
                </span>
                {step.trigger === 'manual' && (
                  <button
                    type="button"
                    className="workflow-run-step"
                    disabled={busy || !step.enabled || !canRunWorkflowStepManually(step)}
                    onClick={() => onRunStep?.(step)}
                  >
                    运行此步骤
                  </button>
                )}
                <div className="workflow-step-head-actions">
                  <button
                    type="button"
                    title="上移"
                    aria-label="上移"
                    onClick={() => move(index, -1)}
                    disabled={busy || index === 0}
                  >
                    <IconArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    title="下移"
                    aria-label="下移"
                    onClick={() => move(index, 1)}
                    disabled={busy || index === steps.length - 1}
                  >
                    <IconArrowDown size={14} />
                  </button>
                  <DeleteButton
                    compact
                    label="删除步骤"
                    description={`步骤“${step.name || labels[step.type]}”及其配置将被删除，无法撤销。`}
                    className="workflow-step-delete-btn"
                    disabled={busy}
                    onConfirm={() => {
                      remove(step.id);
                    }}
                  />
                  <button
                    type="button"
                    className={`workflow-step-toggle-btn ${isCollapsed ? 'is-collapsed' : ''}`}
                    title={isCollapsed ? '展开步骤' : '折叠步骤'}
                    aria-label={isCollapsed ? '展开步骤' : '折叠步骤'}
                    aria-expanded={!isCollapsed}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleCollapse(step.id);
                    }}
                  >
                    <IconChevronDown
                      size={14}
                      className={`workflow-step-toggle-icon ${isCollapsed ? 'is-collapsed' : ''}`}
                    />
                  </button>
                </div>
              </div>
              <HeightTransition
                as="fieldset"
                open={!isCollapsed}
                disabled={busy}
                contentClassName="workflow-step-body"
              >
                {step.trigger === 'manual' && !canRunWorkflowStepManually(step) && (
                  <p className="workflow-step-source-hint" role="alert">
                    此步骤需要随主请求执行，请在执行设置中改为自动执行。
                  </p>
                )}
                <AnimatedDetails
                  className="workflow-step-execution"
                  summary={
                    <>
                      执行设置 · {step.trigger === 'manual' ? '手动运行' : '自动执行'} ·{' '}
                      {step.failurePolicy === 'continue' ? '失败继续' : '失败停止'}
                      {step.condition &&
                        ` · 条件：${step.condition.source === 'flow' ? '流程变量' : step.condition.source === 'variable' ? '本次变量' : '响应'}.${step.condition.path || '未填写'}${step.condition.expected === undefined ? ' 为真值' : ` = ${step.condition.expected}`}`}
                    </>
                  }
                >
                  <div className="workflow-step-execution-fields">
                    <label>
                      备注名称（可选）
                      <input
                        className="ui-input"
                        aria-label="步骤备注名称"
                        placeholder={labels[step.type]}
                        value={step.name === labels[step.type] ? '' : step.name}
                        onChange={(event) =>
                          update(step.id, { name: event.target.value || labels[step.type] })
                        }
                      />
                    </label>
                    <label>
                      执行方式
                      {select(
                        step,
                        'trigger',
                        options([
                          ['auto', '随主请求自动执行'],
                          ...(canRunWorkflowStepManually(step)
                            ? [['manual', '仅手动执行'] as [string, string]]
                            : []),
                        ]),
                      )}
                    </label>

                    <label>
                      失败处理
                      {select(
                        step,
                        'failurePolicy',
                        options([
                          [
                            'abort',
                            phase === 'pre-request'
                              ? '停止后续步骤，不发送主请求'
                              : '停止后续步骤，保留响应',
                          ],
                          ['continue', '记录错误，继续执行'],
                        ]),
                      )}
                    </label>
                    {!canRunWorkflowStepManually(step) && (
                      <p className="workflow-step-source-hint">
                        此操作需要随主请求执行。
                        {step.trigger === 'manual' ? '请将已有的手动配置改为自动执行。' : ''}
                      </p>
                    )}

                    <label>
                      执行条件
                      <SelectMenu
                        disabled={busy}
                        ariaLabel="执行条件"
                        value={step.condition ? 'conditional' : 'always'}
                        options={options([
                          ['always', '始终执行'],
                          ['conditional', '符合条件时执行'],
                        ])}
                        onChange={(value) =>
                          update(step.id, {
                            condition:
                              value === 'always' ? undefined : { source: 'flow', path: '' },
                          })
                        }
                      />
                    </label>
                    {step.condition && (
                      <>
                        <label>
                          条件来源
                          <SelectMenu
                            disabled={busy}
                            ariaLabel="条件来源"
                            value={step.condition.source}
                            options={options([
                              ['flow', '流程变量'],
                              ['variable', '本次变量'],
                              ...(phase === 'post-response'
                                ? [['response', '响应（status/json）'] as [string, string]]
                                : []),
                            ])}
                            onChange={(source) =>
                              update(step.id, {
                                condition: {
                                  ...step.condition!,
                                  source: source as 'flow' | 'variable' | 'response',
                                },
                              })
                            }
                          />
                        </label>
                        <label>
                          条件路径
                          <input
                            className="ui-input"
                            value={step.condition.path}
                            placeholder="响应字段路径或变量名"
                            onChange={(event) =>
                              update(step.id, {
                                condition: { ...step.condition!, path: event.target.value },
                              })
                            }
                          />
                        </label>
                        <label>
                          等于（留空表示真值）
                          <input
                            className="ui-input"
                            value={step.condition.expected ?? ''}
                            onChange={(event) =>
                              update(step.id, {
                                condition: {
                                  ...step.condition!,
                                  expected: event.target.value || undefined,
                                },
                              })
                            }
                          />
                        </label>
                      </>
                    )}
                  </div>
                </AnimatedDetails>
                {step.type === 'script' && (
                  <div className="workflow-script-step">
                    <p>
                      支持读取数据、计算、调用接口和保存变量。
                      {phase === 'post-response'
                        ? '后置脚本可读取已发送的请求和响应，不能修改已发送的请求。'
                        : step.trigger === 'manual'
                          ? '手动脚本独立运行，不能修改主请求。'
                          : '请求修改只对本次发送生效。'}
                      使用 nextdoc.variables、nextdoc.flow、nextdoc.results 共享数据。
                    </p>
                    <CodeEditor
                      ariaLabel="步骤脚本"
                      language="text"
                      readOnly={busy}
                      value={step.scriptCode || ''}
                      onChange={(scriptCode) => update(step.id, { scriptCode })}
                    />
                  </div>
                )}
                {step.type === 'input' && (
                  <>
                    <label>
                      关联手动步骤（刷新时清除输入）
                      <SelectMenu
                        disabled={busy}
                        ariaLabel="关联手动步骤"
                        clearable
                        value={step.resultStepId || ''}
                        options={steps
                          .slice(0, index)
                          .filter(
                            (item) =>
                              item.enabled &&
                              item.trigger === 'manual' &&
                              canRunWorkflowStepManually(item),
                          )
                          .map((item) => ({ value: item.id, label: item.name }))}
                        onChange={(resultStepId) =>
                          update(step.id, { resultStepId: resultStepId || undefined })
                        }
                      />
                    </label>
                    <label>等待填写的流程变量{input(step, 'path', '流程变量名')}</label>
                    <label>
                      填写值
                      <input
                        className="ui-input"
                        disabled={busy || !step.path}
                        value={String(flow[step.path || ''] ?? '')}
                        onChange={(event) =>
                          step.path && onFlowChange?.(step.path, event.target.value)
                        }
                      />
                    </label>
                    <p className="workflow-step-source-hint">
                      为空时停止发送。填写后再次点击发送；不会重新运行手动获取步骤。
                    </p>
                  </>
                )}
                {['extract', 'transform', 'write', 'security', 'assert'].includes(step.type) && (
                  <div className="workflow-step-fields">
                    <span className="workflow-step-section-title">读取数据</span>
                    <label>
                      读取来源
                      {select(
                        step,
                        'source',
                        options([
                          ['request', phase === 'post-response' ? '已发送的请求' : '当前请求'],
                          ...(phase === 'post-response'
                            ? [['response', '主请求响应'] as [string, string]]
                            : []),
                          ['variable', '本次变量'],
                          ['flow', '流程变量'],
                          ['result', '步骤结果'],
                          ['fixed', '固定值'],
                        ]),
                      )}
                    </label>
                    {(step.source === 'request' || step.source === 'response') && (
                      <label>
                        读取位置
                        {select(
                          step,
                          'sourcePart',
                          options(
                            step.source === 'request'
                              ? [
                                  ['body', 'JSON Body'],
                                  ['headers', 'Header'],
                                  ['query', 'Query'],
                                  ['path', 'Path 参数'],
                                  ['form', 'form-data 文本字段'],
                                  ['urlencoded', 'URL 编码表单字段'],
                                  ['text', '原始 Body 文本'],
                                ]
                              : [
                                  ['body', '响应 JSON'],
                                  ['headers', '响应 Header'],
                                  ['status', 'HTTP 状态码'],
                                  ['text', '原始文本'],
                                ],
                          ),
                        )}
                      </label>
                    )}
                    {step.source === 'result' && (
                      <label>
                        结果步骤
                        <SelectMenu
                          ariaLabel="结果步骤"
                          disabled={busy}
                          value={step.resultStepId || ''}
                          options={[...precedingSteps, ...steps.slice(0, index)]
                            .filter((item) => item.enabled)
                            .map((item) => ({ value: item.id, label: item.name }))}
                          onChange={(resultStepId) => update(step.id, { resultStepId, path: '' })}
                        />
                      </label>
                    )}
                    {(step.source === 'request' || step.source === 'response') &&
                    (step.sourcePart === 'status' || step.sourcePart === 'text') ? (
                      <p className="workflow-step-source-hint">
                        {step.sourcePart === 'status'
                          ? '读取 HTTP 状态码，无需填写字段路径。'
                          : '读取完整文本，无需填写字段路径。'}
                      </p>
                    ) : (
                      <label>
                        {step.source === 'fixed'
                          ? '固定值'
                          : step.source === 'variable' || step.source === 'flow'
                            ? '变量名或路径'
                            : '字段路径'}
                        {input(
                          step,
                          step.source === 'fixed' ? 'value' : 'path',
                          step.source === 'fixed' ? '输入文本值' : '$ 表示整体，或输入字段路径',
                        )}
                      </label>
                    )}
                  </div>
                )}
                {step.type === 'security' && (
                  <>
                    <label>目标认证方案{select(step, 'targetField', securityOptions)}</label>
                    {!securityOptions.length && (
                      <p className="workflow-step-source-hint">
                        当前文档未声明认证方案；可使用前置“设置请求参数”写入 Header、Query 或
                        Cookie。
                      </p>
                    )}
                  </>
                )}
                {results[step.id] !== undefined && (
                  <AnimatedDetails
                    className="workflow-step-result"
                    summary={<>查看上次手动执行结果</>}
                  >
                    {typeof results[step.id] === 'object' &&
                      results[step.id] !== null &&
                      typeof (results[step.id] as { image?: unknown }).image === 'string' && (
                        <img
                          alt="辅助请求返回的图片"
                          src={(results[step.id] as { image: string }).image}
                        />
                      )}
                    <pre>
                      {JSON.stringify(
                        results[step.id],
                        (key, value) => (key === 'image' ? '[图片见上方]' : value),
                        2,
                      )}
                    </pre>
                  </AnimatedDetails>
                )}
                {step.type === 'request' && (
                  <>
                    <label className="workflow-field-full">
                      <span>当前文档接口</span>
                      <SelectMenu
                        disabled={busy}
                        ariaLabel="选择接口"
                        className="workflow-step-select"
                        searchable={true}
                        searchPlaceholder="搜索接口路径或名称..."
                        options={operationOptions}
                        value={step.endpoint ? `${step.method || 'GET'} ${step.endpoint}` : ''}
                        onChange={(value) => {
                          const [method, ...path] = value.split(' ');
                          update(step.id, { method, endpoint: path.join(' ') });
                        }}
                      />
                    </label>
                    <AnimatedDetails
                      className="workflow-request-custom workflow-field-full"
                      summary={<>自定义地址与方法（文档外接口）</>}
                    >
                      <div className="workflow-step-execution-fields">
                        <label>请求地址{input(step, 'endpoint', '相对路径或完整 URL')}</label>
                        <label>
                          方法
                          {select(
                            step,
                            'method',
                            options(
                              ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map(
                                (value) => [value, value],
                              ),
                            ),
                          )}
                        </label>
                      </div>
                    </AnimatedDetails>
                    <label className="workflow-field-full">
                      <span>请求头（JSON）</span>
                      <textarea
                        className="ui-input workflow-textarea-mono"
                        rows={2}
                        value={step.requestHeaders || ''}
                        placeholder='{"Accept":"application/json"}'
                        onChange={(event) =>
                          update(step.id, { requestHeaders: event.target.value })
                        }
                      />
                    </label>
                    <div className="workflow-field-full workflow-body-section">
                      <div className="workflow-body-header">
                        <span>Body（表单使用 JSON 对象，数组表示同名多值）</span>
                        <div className="workflow-body-type-picker">
                          <span className="workflow-body-type-label">类型:</span>
                          {select(
                            step,
                            'requestBodyKind',
                            options([
                              ['auto', '自动识别 JSON / 文本'],
                              ['json', 'JSON'],
                              ['text', '原始文本 / XML'],
                              ['urlencoded', 'application/x-www-form-urlencoded'],
                              ['form-data', 'multipart/form-data 文本字段'],
                            ]),
                          )}
                        </div>
                      </div>
                      <textarea
                        className="ui-input workflow-textarea-mono"
                        rows={3}
                        value={step.requestBody || ''}
                        placeholder="支持 {{flow.name}}、{{run.name}} 等变量引用"
                        onChange={(event) => update(step.id, { requestBody: event.target.value })}
                      />
                    </div>
                    <div className="workflow-field-full workflow-step-switches">
                      <label className="workflow-switch-label">
                        <SwitchControl
                          disabled={busy}
                          checked={step.inheritHeaders ?? false}
                          label="继承主请求头（仅同源）"
                          showState={false}
                          onChange={(checked) => update(step.id, { inheritHeaders: checked })}
                        />
                        <span>继承主请求头（仅同源）</span>
                      </label>
                      <label className="workflow-switch-label">
                        <SwitchControl
                          disabled={busy}
                          checked={step.allowHttpErrors ?? false}
                          label="允许非 2xx 响应继续（可在后续步骤读取状态和错误正文）"
                          showState={false}
                          onChange={(checked) => update(step.id, { allowHttpErrors: checked })}
                        />
                        <span>允许非 2xx 响应继续</span>
                      </label>
                    </div>
                    <label className="workflow-field-full">
                      <span>图片预览路径（可选）</span>
                      {input(step, 'previewPath', '如 json.img，读取 Base64 图片')}
                    </label>
                  </>
                )}
                {step.type === 'transform' && (
                  <>
                    <label>
                      转换类别
                      <SelectMenu
                        ariaLabel="转换类别"
                        disabled={busy}
                        value={
                          workflowTransformOptions.find(
                            (item) => item.value === (step.algorithm ?? 'base64'),
                          )?.category ?? ''
                        }
                        options={[
                          ...new Set(workflowTransformOptions.map((item) => item.category)),
                        ].map((value) => ({ value, label: value }))}
                        onChange={(category) =>
                          update(step.id, {
                            algorithm: workflowTransformOptions.find(
                              (item) => item.category === category,
                            )!.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      转换方式
                      {select(
                        step,
                        'algorithm',
                        workflowTransformOptions.filter(
                          (item) =>
                            item.category ===
                            workflowTransformOptions.find(
                              (option) => option.value === (step.algorithm ?? 'base64'),
                            )?.category,
                        ),
                      )}
                    </label>
                    <p className="workflow-step-source-hint">
                      转换结果可保存为变量或交给后续步骤使用；JSON
                      解析、数字和布尔转换会保留结果类型。 自定义计算、字段映射或复杂组合可使用 JS
                      脚本。
                    </p>
                    {(step.writeBack ||
                      (phase === 'pre-request' &&
                        step.source === 'request' &&
                        step.sourcePart === 'body' &&
                        step.trigger !== 'manual')) && (
                      <div className="workflow-field-full workflow-step-switches">
                        <label className="workflow-switch-label">
                          <SwitchControl
                            disabled={busy}
                            checked={step.writeBack ?? false}
                            label="替换本次请求中的原 JSON 字段"
                            showState={false}
                            onChange={(checked) => update(step.id, { writeBack: checked })}
                          />
                          <span>替换本次请求中的原 JSON 字段</span>
                        </label>
                      </div>
                    )}
                    {(step.algorithm === 'rsa-oaep' || step.algorithm === 'rsa-pkcs1') && (
                      <>
                        {step.algorithm === 'rsa-oaep' && (
                          <label>
                            OAEP 哈希
                            <SelectMenu
                              disabled={busy}
                              ariaLabel="OAEP 哈希"
                              className="workflow-step-select"
                              value={step.rsaHash ?? 'SHA-256'}
                              options={options(
                                ['SHA-256', 'SHA-1', 'SHA-384', 'SHA-512'].map((hash) => [
                                  hash,
                                  hash,
                                ]),
                              )}
                              onChange={(rsaHash) =>
                                update(step.id, { rsaHash: rsaHash as WorkflowStep['rsaHash'] })
                              }
                            />
                          </label>
                        )}
                        <label className="workflow-step-public-key">
                          RSA 公钥
                          <textarea
                            aria-label="RSA 公钥"
                            className="ui-input"
                            rows={4}
                            spellCheck={false}
                            placeholder="粘贴 BEGIN PUBLIC KEY 格式的 PEM 或 SPKI Base64 公钥"
                            value={step.rsaPublicKey ?? ''}
                            onChange={(event) =>
                              update(step.id, { rsaPublicKey: event.target.value })
                            }
                          />
                          <span>
                            {step.algorithm === 'rsa-oaep'
                              ? '输出 Base64；OAEP 与 MGF1 使用相同哈希，需与后端一致。'
                              : '输出 Base64，对应后端 RSA/ECB/PKCS1Padding。'}
                          </span>
                        </label>
                      </>
                    )}
                    {step.algorithm === 'aes-cbc' && (
                      <>
                        <label>密钥{input(step, 'key', '密钥')}</label>
                        <label>IV{input(step, 'iv', '偏移量')}</label>
                      </>
                    )}
                  </>
                )}
                {step.type === 'write' && (
                  <>
                    <label>
                      写入目标
                      {select(
                        step,
                        'targetType',
                        options(
                          phase === 'pre-request'
                            ? [
                                ['header', 'Header'],
                                ['query', 'Query'],
                                ['body', 'Body (JSON)'],
                                ['text', 'Body 原始文本（JSON/XML/raw）'],
                                ['path', 'Path 参数'],
                                ['form', 'form-data 文本字段'],
                                ['urlencoded', 'URL 编码表单字段'],
                                ['cookie', 'Cookie（需启用浏览器凭据）'],
                                ['variable', '本次变量'],
                                ['flow', '流程变量'],
                              ]
                            : [
                                ['variable', '本次变量'],
                                ['flow', '流程变量'],
                              ],
                        ),
                      )}
                    </label>
                    {step.targetType !== 'text' && (
                      <label>
                        {step.targetType === 'body'
                          ? '目标字段路径'
                          : step.targetType === 'variable' || step.targetType === 'flow'
                            ? '目标变量名'
                            : '参数名'}
                        {input(
                          step,
                          'targetField',
                          step.targetType === 'body'
                            ? '如 $.name；$ 表示整个 JSON'
                            : step.targetType === 'variable' || step.targetType === 'flow'
                              ? '输入变量名'
                              : '输入参数名',
                        )}
                      </label>
                    )}
                    {step.source === 'request' &&
                      steps
                        .slice(0, index)
                        .some(
                          (item) => item.enabled && item.type === 'transform' && item.saveAs,
                        ) && (
                        <div className="workflow-step-source-hint">
                          也可以读取前面转换步骤保存的变量：
                          {steps
                            .slice(0, index)
                            .filter(
                              (item) =>
                                item.enabled && item.type === 'transform' && Boolean(item.saveAs),
                            )
                            .map((item) => (
                              <button
                                className="pre-post-text-btn"
                                type="button"
                                key={item.id}
                                onClick={() =>
                                  update(step.id, {
                                    source: item.scope === 'flow' ? 'flow' : 'variable',
                                    path: item.saveAs,
                                  })
                                }
                              >
                                使用转换结果：{item.saveAs || 'value'}
                              </button>
                            ))}
                        </div>
                      )}
                  </>
                )}
                {step.type === 'assert' && (
                  <>
                    <label>
                      条件
                      {select(
                        step,
                        'operator',
                        options([
                          ['equals', '等于'],
                          ['contains', '包含'],
                          ['not-empty', '不为空'],
                        ]),
                      )}
                    </label>
                    {step.operator !== 'not-empty' && (
                      <label>期望值{input(step, 'expectedValue', '期望值')}</label>
                    )}
                  </>
                )}
                {['request', 'script', 'extract', 'transform'].includes(step.type) && (
                  <div className="workflow-step-fields">
                    <span className="workflow-step-section-title">保存结果</span>
                    <label>
                      {step.type === 'extract' ? '保存到变量（必填）' : '保存到变量（可选）'}
                      {input(step, 'saveAs', '输入变量名')}
                    </label>
                    {step.saveAs?.trim() && (
                      <label>
                        变量作用域
                        {select(
                          step,
                          'scope',
                          options([
                            ['run', '本次执行（前后置共享）'],
                            ['flow', '当前服务会话（跨接口使用）'],
                          ]),
                        )}
                      </label>
                    )}
                    <p className="workflow-step-source-hint">
                      {step.saveAs?.trim()
                        ? step.scope === 'flow'
                          ? '当前服务的其他接口可读取此变量；刷新页面或重置流程后清除。'
                          : step.trigger === 'manual'
                            ? '手动执行的本次变量不会传给后续请求；需要复用时请选择当前服务会话。'
                            : '本次发送的前置、后置步骤均可读取；下次发送重新生成。'
                        : step.type === 'extract'
                          ? '填写变量名，供后续步骤读取。'
                          : '不填写变量名时，后续步骤仍可通过“步骤结果”读取。'}
                    </p>
                  </div>
                )}
              </HeightTransition>
            </div>
          );
        })}
      </div>
    </div>
  );
}
