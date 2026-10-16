// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { EditorView } from '@codemirror/view';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { WorkflowStepPanel } from '../../src/features/playground/workflow-step-panel';
import { createWorkflowStep } from '../../src/features/playground/pre-post-types';
import type { WorkflowStep, PrePostPhase } from '../../src/features/playground/pre-post-types';

let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('CSS', { escape: (value: string) => value });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

/** Renders a controlled step panel for configuration interactions.
 * @param steps Initial ordered configuration.
 * @param phase Phase whose available sources are under test.
 * @returns Change observer containing the next configuration.
 */
async function renderSteps(steps: WorkflowStep[], phase: PrePostPhase = 'pre-request') {
  const onChange = vi.fn();
  await act(async () =>
    root.render(
      <WorkflowStepPanel
        availableOperations={[]}
        config={{ steps }}
        phase={phase}
        onChange={onChange}
      />,
    ),
  );
  return onChange;
}

/** Selects a value through the real floating menu.
 * @param label Accessible menu label.
 * @param value Option value to choose.
 * @returns Completion after the click has propagated.
 */
async function choose(label: string, value: string) {
  await act(async () => host.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!.click());
  const option = document.querySelector<HTMLButtonElement>(`[data-select-value="${value}"]`);
  expect(option).not.toBeNull();
  await act(async () => option!.click());
}

it.each(['extract', 'transform', 'write', 'security', 'assert'] as const)(
  'shows only a fixed value input for %s instead of source paths',
  async (type) => {
    const step = {
      ...createWorkflowStep(type, 'pre-request'),
      source: 'fixed' as const,
      writeBack: false,
    };
    await renderSteps([step]);
    expect(host.querySelector('[aria-label="固定值"]')).not.toBeNull();
    expect(host.querySelector('[aria-label="读取位置"]')).toBeNull();
    expect(host.querySelector('[aria-label="路径 / 输入"]')).toBeNull();
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="读取来源"]')!.click(),
    );
    expect(document.querySelector('[data-select-value="fixed"]')).not.toBeNull();
    expect(document.querySelector('[data-select-value="response"]')).toBeNull();
  },
);

it('resets incompatible source fields when switching a response status to request data', async () => {
  const step = {
    ...createWorkflowStep('extract', 'post-response'),
    sourcePart: 'status' as const,
    path: 'stale',
    resultStepId: 'old',
  };
  const onChange = await renderSteps([step], 'post-response');
  expect(host.querySelector('[aria-label="路径 / 输入"]')).toBeNull();
  await choose('读取来源', 'request');
  const next = onChange.mock.calls[0][0].steps[0];
  expect(next).toMatchObject({ source: 'request', sourcePart: 'body', path: '' });
  expect(next.resultStepId).toBeUndefined();
  await renderSteps([next], 'post-response');
  expect(host.querySelector('[aria-label="路径 / 输入"]')).not.toBeNull();
});

it.each(['status', 'text'] as const)(
  'reads the entire response %s without an irrelevant path field',
  async (sourcePart) => {
    await renderSteps(
      [{ ...createWorkflowStep('extract', 'post-response'), sourcePart }],
      'post-response',
    );
    expect(host.querySelector('[aria-label="路径 / 输入"]')).toBeNull();
    expect(host.textContent).toContain('无需填写字段路径');
  },
);

it('shows an expected value only for assertions that use it', async () => {
  const onChange = await renderSteps([createWorkflowStep('assert', 'pre-request')]);
  expect(host.querySelector('input[placeholder="期望值"]')).toBeNull();
  await choose('校验条件', 'equals');
  await renderSteps(onChange.mock.calls[0][0].steps);
  expect(host.querySelector('input[placeholder="期望值"]')).not.toBeNull();
});

it('offers a configured flow variable before its producer has run', async () => {
  const producer = {
    ...createWorkflowStep('extract', 'pre-request'),
    scope: 'flow' as const,
    saveAs: 'shared',
  };
  const consumer = { ...createWorkflowStep('write', 'pre-request'), source: 'flow' as const };
  const onChange = await renderSteps([producer, consumer]);
  const card = host.querySelector(`[data-workflow-step-id="${consumer.id}"]`)!;
  await act(async () =>
    card.querySelector<HTMLInputElement>('[aria-label="路径 / 输入"]')!.click(),
  );
  const option = document.querySelector<HTMLButtonElement>('[data-select-value="shared"]')!;
  expect(option).not.toBeNull();
  await act(async () => option.click());
  expect(onChange.mock.calls[0][0].steps[1]).toMatchObject({ source: 'flow', path: 'shared' });
});

it('only asks for a scope when a named result will be saved', async () => {
  const step = createWorkflowStep('request', 'pre-request');
  await renderSteps([step]);
  expect(host.querySelector('[aria-label="变量作用域"]')).toBeNull();
  expect(host.textContent).toContain('通过“步骤结果”读取');
  await renderSteps([{ ...step, saveAs: 'result', scope: 'flow' }]);
  expect(host.querySelector('[aria-label="变量作用域"]')).not.toBeNull();
  expect(host.textContent).toContain('刷新页面或重置流程后清除');
});

it.each(['write', 'transform', 'input'] as const)(
  'keeps %s operations that depend on the main send automatic',
  async (type) => {
    const step = createWorkflowStep(type, 'pre-request');
    await renderSteps([step]);
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="执行方式"]')!.click(),
    );
    expect(document.querySelector('[data-select-value="manual"]')).toBeNull();
    expect(document.querySelector('[data-select-value="auto"]')).not.toBeNull();
  },
);

it('retains manual execution for variable writes and switches to automatic when targeting a header', async () => {
  const step = {
    ...createWorkflowStep('write', 'pre-request'),
    trigger: 'manual' as const,
    targetType: 'flow' as const,
    targetField: 'saved',
  };
  const onChange = await renderSteps([step]);
  await choose('写入目标', 'header');
  expect(onChange.mock.calls[0][0].steps[0]).toMatchObject({
    trigger: 'auto',
    targetType: 'header',
    targetField: '',
  });
});

it('keeps condition and failure details visible in the collapsed execution summary', async () => {
  await renderSteps(
    [
      {
        ...createWorkflowStep('extract', 'post-response'),
        failurePolicy: 'continue',
        condition: { source: 'response', path: 'status', expected: '200' },
      },
    ],
    'post-response',
  );
  const details = host.querySelector<HTMLDetailsElement>('.workflow-step-execution')!;
  expect(details.open).toBe(false);
  expect(details.querySelector('summary')!.textContent).toContain('失败继续');
  expect(details.querySelector('summary')!.textContent).toContain('响应.status = 200');
  expect(details.querySelector('[aria-label="失败处理"]')).not.toBeNull();
});

it('explains an old manual request-write configuration without silently executing it', async () => {
  const step = { ...createWorkflowStep('write', 'pre-request'), trigger: 'manual' as const };
  await renderSteps([step]);
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('改为自动执行');
  expect(host.querySelector<HTMLButtonElement>('.workflow-run-step')!.disabled).toBe(true);
});

it('offers fields from an auxiliary result and documented body destinations without restricting custom paths', async () => {
  const request = { ...createWorkflowStep('request', 'pre-request'), trigger: 'manual' as const };
  const write = {
    ...createWorkflowStep('write', 'pre-request'),
    source: 'result' as const,
    resultStepId: request.id,
  };
  const onChange = vi.fn();
  await act(async () =>
    root.render(
      <WorkflowStepPanel
        availableOperations={[]}
        config={{ steps: [request, write] }}
        phase="pre-request"
        results={{ [request.id]: { json: { payload: { value: 'example' } } } }}
        pathOptions={{ request: [{ value: '$.destination', label: '目标字段' }], response: [] }}
        onChange={onChange}
      />,
    ),
  );
  const card = host.querySelector(`[data-workflow-step-id="${write.id}"]`)!;
  await act(async () =>
    card.querySelector<HTMLInputElement>('[aria-label="路径 / 输入"]')!.click(),
  );
  await act(async () =>
    document
      .querySelector<HTMLButtonElement>('[data-select-value="$.json.payload.value"]')!
      .click(),
  );
  expect(onChange.mock.calls[0][0].steps[1].path).toBe('$.json.payload.value');
  const target = card.querySelector<HTMLInputElement>('[aria-label="目标字段路径"]')!;
  await act(async () => target.click());
  expect(document.querySelector('[data-select-value="$.destination"]')).not.toBeNull();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
      target,
      '$.custom.field',
    );
    target.dispatchEvent(new Event('input', { bubbles: true }));
  });
  expect(onChange.mock.calls.at(-1)![0].steps[1].targetField).toBe('$.custom.field');
});

it('closes the open path picker when execution starts', async () => {
  const config = { steps: [createWorkflowStep('extract', 'pre-request')] };
  const pathOptions = { request: [{ value: '$.value', label: '字段' }], response: [] };
  await act(async () =>
    root.render(
      <WorkflowStepPanel
        availableOperations={[]}
        config={config}
        phase="pre-request"
        pathOptions={pathOptions}
        onChange={vi.fn()}
      />,
    ),
  );
  await act(async () =>
    host.querySelector<HTMLInputElement>('[aria-label="路径 / 输入"]')!.click(),
  );
  expect(document.querySelector('[role="listbox"]')).not.toBeNull();
  await act(async () =>
    root.render(
      <WorkflowStepPanel
        availableOperations={[]}
        config={config}
        phase="pre-request"
        pathOptions={pathOptions}
        busy
        onChange={vi.fn()}
      />,
    ),
  );
  expect(document.querySelector('[role="listbox"]')).toBeNull();
  expect(host.querySelector<HTMLInputElement>('[aria-label="路径 / 输入"]')!.disabled).toBe(true);
});

it('offers text and typed conversions separately from encryption and hides irrelevant key fields', async () => {
  const onChange = await renderSteps([createWorkflowStep('transform', 'pre-request')]);
  expect(host.querySelector('[aria-label="转换类别"]')?.textContent).toContain('文本处理');
  expect(host.querySelector('[aria-label="转换方式"]')?.textContent).toContain('去除首尾空白');
  await choose('转换类别', 'JSON / 类型转换');
  expect(onChange.mock.calls[0][0].steps[0].algorithm).toBe('json-parse');
  await renderSteps(onChange.mock.calls[0][0].steps);
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="转换方式"]')!.click());
  expect(document.querySelector('[data-select-value="to-number"]')).not.toBeNull();
  expect(document.querySelector('[data-select-value="rsa-oaep"]')).toBeNull();
  expect(host.querySelector('[aria-label="RSA 公钥"]')).toBeNull();
});

it('restores the category for existing RSA steps without changing their saved algorithm', async () => {
  await renderSteps([
    {
      ...createWorkflowStep('transform', 'pre-request'),
      algorithm: 'rsa-pkcs1',
      rsaPublicKey: 'saved-key',
    },
  ]);
  expect(host.querySelector('[aria-label="转换类别"]')?.textContent).toContain('加密');
  expect(host.querySelector('[aria-label="转换方式"]')?.textContent).toContain('RSA PKCS#1');
  expect(host.querySelector<HTMLTextAreaElement>('[aria-label="RSA 公钥"]')?.value).toBe(
    'saved-key',
  );
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('locks the real script editor while busy and restores editing afterward', async () => {
  vi.spyOn(EditorView.prototype, 'coordsAtPos').mockReturnValue({
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  });
  const config = {
    steps: [{ ...createWorkflowStep('script', 'pre-request'), scriptCode: 'return 1;' }],
  };
  const onChange = vi.fn();
  await act(async () =>
    root.render(
      <WorkflowStepPanel
        availableOperations={[]}
        config={config}
        phase="pre-request"
        busy
        onChange={onChange}
      />,
    ),
  );
  const editor = host.querySelector('.cm-content')!;
  expect(editor.getAttribute('contenteditable')).toBe('false');
  await act(async () =>
    root.render(
      <WorkflowStepPanel
        availableOperations={[]}
        config={config}
        phase="pre-request"
        onChange={onChange}
      />,
    ),
  );
  expect(editor.getAttribute('contenteditable')).toBe('true');
  // Exercise the actual CodeMirror mouse handler, without jsdom layout calculations.
  vi.spyOn(EditorView.prototype, 'posAtCoords').mockReturnValue(0);
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  await act(async () => {
    editor.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
  });
  expect(errors).not.toHaveBeenCalled();
});

it.each(['run', 'flow'] as const)(
  'selects the %s scope when using a conversion result',
  async (scope) => {
    const transform = {
      ...createWorkflowStep('transform', 'pre-request'),
      scope,
      saveAs: 'encoded',
    };
    const write = createWorkflowStep('write', 'pre-request');
    const onChange = vi.fn();
    await act(async () =>
      root.render(
        <WorkflowStepPanel
          availableOperations={[]}
          config={{ steps: [transform, write] }}
          phase="pre-request"
          onChange={onChange}
        />,
      ),
    );
    const button = [...host.querySelectorAll('button')].find((item) =>
      item.textContent?.includes('使用转换结果'),
    )!;
    await act(async () => button.click());
    expect(onChange.mock.calls[0][0].steps[1]).toMatchObject({
      source: scope === 'flow' ? 'flow' : 'variable',
      path: 'encoded',
    });
  },
);

it('does not run a disabled manual step', async () => {
  const step = {
    ...createWorkflowStep('request', 'pre-request'),
    trigger: 'manual' as const,
    enabled: false,
  };
  const onRunStep = vi.fn();
  await act(async () =>
    root.render(
      <WorkflowStepPanel
        availableOperations={[]}
        config={{ steps: [step] }}
        phase="pre-request"
        onChange={vi.fn()}
        onRunStep={onRunStep}
      />,
    ),
  );
  const button = [...host.querySelectorAll('button')].find(
    (item) => item.textContent === '运行此步骤',
  )!;
  expect(button.disabled).toBe(true);
  await act(async () => button.click());
  expect(onRunStep).not.toHaveBeenCalled();
});

it('supports collapsing and expanding step cards via header click and arrow button', async () => {
  const step = createWorkflowStep('request', 'pre-request');
  const onChange = vi.fn();
  await act(async () =>
    root.render(
      <WorkflowStepPanel
        availableOperations={[]}
        config={{ steps: [step] }}
        phase="pre-request"
        onChange={onChange}
      />,
    ),
  );

  const card = host.querySelector<HTMLDivElement>('.workflow-step-card')!;
  const head = host.querySelector<HTMLDivElement>('.workflow-step-head')!;
  const body = host.querySelector<HTMLFieldSetElement>('.workflow-step-body')!;
  const deleteBtn = host.querySelector<HTMLButtonElement>('.workflow-step-delete-btn')!;
  const toggleBtn = host.querySelector<HTMLButtonElement>('.workflow-step-toggle-btn')!;

  // 1. Initial state: expanded
  expect(card.classList.contains('is-collapsed')).toBe(false);
  expect(body.closest('[inert]')).toBeNull();
  expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
  expect(toggleBtn.getAttribute('aria-label')).toBe('折叠步骤');

  // Arrow button is placed to the right of the trashcan button
  expect(deleteBtn.closest('.rare-delete')?.nextElementSibling).toBe(toggleBtn);

  // 2. Click header non-button area (e.g. step title) collapses the card
  const title = host.querySelector<HTMLSpanElement>('.workflow-step-title')!;
  await act(async () => title.click());

  expect(card.classList.contains('is-collapsed')).toBe(true);
  expect(body.closest('[inert]')).not.toBeNull();
  expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
  expect(toggleBtn.getAttribute('aria-label')).toBe('展开步骤');

  // 3. Click the toggle button expands the card back
  await act(async () => toggleBtn.click());

  expect(card.classList.contains('is-collapsed')).toBe(false);
  expect(body.closest('[inert]')).toBeNull();
  expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');

  // 4. Clicking switch control toggles enabled without toggling card collapse
  const switchBtn = host.querySelector<HTMLButtonElement>('.workflow-step-head [role="switch"]')!;
  await act(async () => switchBtn.click());

  expect(onChange).toHaveBeenCalled();
  expect(card.classList.contains('is-collapsed')).toBe(false);

  // 5. Clicking header background collapses it again
  await act(async () => head.click());
  expect(card.classList.contains('is-collapsed')).toBe(true);
});
