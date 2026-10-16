import { motion } from 'motion/react';
import { useMovingHighlight } from '../../components/rare-ui/use-moving-highlight';
import { useListMotion } from '../../components/rare-ui/use-list-motion';
import { useReducedMotion } from '../../components/rare-ui/use-reduced-motion';
import { DeleteButton } from '../../components/rare-ui/delete-button';
import { SegmentedControl } from '../../components/segmented-control';
import { Input } from '../../components/input';
import { createId } from '../../lib/id';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import {
  IconArrowsExchange,
  IconDeviceDesktop,
  IconEye,
  IconEyeOff,
  IconKey,
  IconLock,
  IconSearch,
  IconServer,
} from '@tabler/icons-react';

import { SelectMenu } from '../../components/select-menu';
import { SwitchControl } from '../../components/switch-control';
import type { ServiceDefinition } from '../../types/openapi';
import type { GlobalHeader } from '../playground/types';
import type { ResolvedSecurityScheme } from '../security/security';

export type ManagementSection = 'auth' | 'config';

interface ManagementPageProps {
  configurationServiceUrl?: string;
  configurationServices: ServiceDefinition[];
  globalDefaultHeaders: GlobalHeader[];
  globalDefaultQueryParams: GlobalHeader[];
  globalHeaders: GlobalHeader[];
  globalQueryParams: GlobalHeader[];
  isAggregation: boolean;
  onConfigurationServiceChange: (serviceUrl: string) => void;
  onGlobalDefaultHeadersChange: (value: GlobalHeader[]) => void;
  onGlobalDefaultQueryParamsChange: (value: GlobalHeader[]) => void;
  onGlobalHeadersChange: (value: GlobalHeader[]) => void;
  onGlobalQueryParamsChange: (value: GlobalHeader[]) => void;
  onSecurityValuesChange: (values: Record<string, string>) => void;
  section: ManagementSection;
  securitySchemes: ResolvedSecurityScheme[];
  securityValues: Record<string, string>;
}

type ParameterKind = 'header' | 'query';
type ParameterScope = 'global' | 'service';
type SecurityFilter = 'all' | 'configured' | 'unconfigured';

interface SchemeSelectionIndicator {
  height: number;
  top: number;
  visible: boolean;
}

/**
 * Counts enabled named parameter rows for the compact injection summary.
 *
 * @param items Parameter rows from one effective request scope.
 * @returns Number of rows that will be attached to a request.
 */
const getEnabledParameterCount = (items: GlobalHeader[]) =>
  items.filter((item) => item.enabled !== false && item.name.trim()).length;

/**
 * Builds the concise protocol text shown below a configured authentication scheme.
 *
 * @param scheme Security scheme supplied by the active OpenAPI document.
 * @returns The scheme type, protocol and injection target text.
 */
const getSecuritySchemeLabel = (scheme: ResolvedSecurityScheme) => {
  if (scheme.type === 'apiKey') {
    return `${scheme.type}${scheme.in ? `, ${scheme.in}` : ''}`;
  }
  return `${scheme.type}${scheme.scheme ? `, ${scheme.scheme}` : ''}`;
};

/**
 * Builds the credential input hint appropriate for the active security scheme.
 *
 * @param scheme Security scheme supplied by the active OpenAPI document.
 * @returns The credential input placeholder text.
 */
const getSecurityPlaceholder = (scheme: ResolvedSecurityScheme) => {
  if (scheme.type === 'http' && scheme.scheme?.toLowerCase() === 'basic') {
    return '用户名:密码';
  }
  if (scheme.type === 'http' && scheme.scheme?.toLowerCase() === 'bearer') {
    return `请输入 ${scheme.bearerFormat || 'Bearer Token'}`;
  }
  return scheme.type === 'apiKey' ? `请输入 ${scheme.name || scheme.key}` : '请输入认证凭据';
};

/**
 * Describes where a resolved OpenAPI security scheme is injected into outgoing debug requests.
 *
 * @param scheme Security scheme selected by the user.
 * @returns A concise target label suitable for the credential detail panel.
 */
const getSecurityInjectionTarget = (scheme: ResolvedSecurityScheme) => {
  if (scheme.type === 'apiKey') {
    const location = scheme.in || 'header';
    return `${location[0].toUpperCase()}${location.slice(1)} · ${scheme.name || scheme.key}`;
  }
  if (scheme.type === 'http') return 'Header · Authorization';
  return '由安全流程提供';
};

/**
 * Serializes the relevant OpenAPI security declaration for the compact scheme reference panel.
 *
 * @param scheme Resolved security scheme selected for editing.
 * @returns Readable JSON containing the declaration fields applicable to the scheme type.
 */
const getSecuritySchemeDefinition = (scheme: ResolvedSecurityScheme) =>
  JSON.stringify(
    {
      ...(scheme.description ? { description: scheme.description } : {}),
      ...(scheme.type === 'apiKey'
        ? { in: scheme.in || 'header', name: scheme.name || scheme.key }
        : {}),
      ...(scheme.type === 'http' && scheme.scheme ? { scheme: scheme.scheme } : {}),
      type: scheme.type,
    },
    undefined,
    2,
  );

interface GlobalParamsEditorProps {
  globalHeaders: GlobalHeader[];
  globalQueryParams: GlobalHeader[];
  headers: GlobalHeader[];
  isAggregation: boolean;
  onGlobalHeadersChange: (items: GlobalHeader[]) => void;
  onGlobalQueryChange: (items: GlobalHeader[]) => void;
  onHeadersChange: (items: GlobalHeader[]) => void;
  onQueryChange: (items: GlobalHeader[]) => void;
  queryParams: GlobalHeader[];
  scope: ParameterScope;
}

type ParameterSource = 'global' | 'inherited' | 'override' | 'service';

interface VisibleParameterRow {
  inherited: boolean;
  item: GlobalHeader;
  source: ParameterSource;
}

const parameterSourceLabels: Record<ParameterSource, string> = {
  global: '全部服务',
  inherited: '继承默认',
  override: '服务覆盖',
  service: '当前服务',
};

/**
 * Normalizes one parameter name for matching gateway defaults with service overrides.
 *
 * @param item Parameter whose request name identifies an override relationship.
 * @returns Trimmed lowercase parameter name, or an empty string for unnamed rows.
 */
const getParameterNameKey = (item: GlobalHeader) => item.name.trim().toLocaleLowerCase();

/**
 * Resolves editable and inherited rows for the selected application mode and parameter scope.
 *
 * @param globalItems Default parameters shared by every aggregation service.
 * @param serviceItems Parameters stored for the current service or single application.
 * @param isAggregation Whether the workspace represents a gateway aggregation document.
 * @param scope Active global-default or current-service editing scope.
 * @returns Visible rows annotated with their source and inherited state.
 */
const resolveParameterRows = (
  globalItems: GlobalHeader[],
  serviceItems: GlobalHeader[],
  isAggregation: boolean,
  scope: ParameterScope,
): VisibleParameterRow[] => {
  if (!isAggregation) {
    return serviceItems.map((item) => ({ inherited: false, item, source: 'service' }));
  }
  if (scope === 'global') {
    return globalItems.map((item) => ({ inherited: false, item, source: 'global' }));
  }
  const serviceNames = new Set(serviceItems.map(getParameterNameKey).filter(Boolean));
  const inheritedRows = globalItems
    .filter((item) => !serviceNames.has(getParameterNameKey(item)))
    .map((item) => ({ inherited: true, item, source: 'inherited' }) satisfies VisibleParameterRow);
  const globalNames = new Set(globalItems.map(getParameterNameKey).filter(Boolean));
  return [
    ...inheritedRows,
    ...serviceItems.map(
      (item) =>
        ({
          inherited: false,
          item,
          source: globalNames.has(getParameterNameKey(item)) ? 'override' : 'service',
        }) satisfies VisibleParameterRow,
    ),
  ];
};

/**
 * Renders the selected configuration scope's editable request parameter table.
 *
 * @param props Header and query rows together with their state persistence callbacks.
 * @returns Parameter type switcher, editable rows and a final input row that creates new parameters.
 */
function GlobalParamsEditor({
  globalHeaders,
  globalQueryParams,
  headers,
  isAggregation,
  onGlobalHeadersChange,
  onGlobalQueryChange,
  onHeadersChange,
  onQueryChange,
  queryParams,
  scope,
}: GlobalParamsEditorProps) {
  const [kind, setKind] = useState<ParameterKind>('header');
  const [draft, setDraft] = useState({ description: '', name: '', value: '' });
  const inputRefs = useRef(new Map<string, HTMLInputElement>());
  const pendingFocusRef = useRef<
    { field: 'description' | 'name' | 'value'; id: string } | undefined
  >(undefined);
  const inGlobalScope = isAggregation && scope === 'global';
  const headerRows = resolveParameterRows(globalHeaders, headers, isAggregation, scope);
  const queryRows = resolveParameterRows(globalQueryParams, queryParams, isAggregation, scope);
  const rows = kind === 'header' ? headerRows : queryRows;
  const tableRef = useRef<HTMLDivElement>(null);
  useMovingHighlight(tableRef, 'tbody > tr[data-motion-row]');
  useListMotion(tableRef, 'tbody > tr[data-motion-row]', rows.map(({ item }) => item.id).join('|'));
  const editableItems =
    kind === 'header'
      ? inGlobalScope
        ? globalHeaders
        : headers
      : inGlobalScope
        ? globalQueryParams
        : queryParams;
  const onChange =
    kind === 'header'
      ? inGlobalScope
        ? onGlobalHeadersChange
        : onHeadersChange
      : inGlobalScope
        ? onGlobalQueryChange
        : onQueryChange;

  useEffect(() => {
    setDraft({ description: '', name: '', value: '' });
  }, [kind, scope]);
  useEffect(() => {
    const pendingFocus = pendingFocusRef.current;
    if (!pendingFocus) return;
    const input = inputRefs.current.get(`${pendingFocus.id}:${pendingFocus.field}`);
    if (!input) return;
    input.focus({ preventScroll: true });
    input.setSelectionRange(input.value.length, input.value.length);
    pendingFocusRef.current = undefined;
  }, [editableItems]);

  /**
   * Commits the final empty table row after its first non-empty entry and restores focus to the row.
   *
   * @param field Draft column that received the first non-empty character.
   * @param value New draft value from the active input control.
   * @returns Nothing; appends a parameter through the callback for the active scope.
   */
  const commitDraft = (field: 'description' | 'name' | 'value', value: string) => {
    if (!value.trim()) {
      setDraft((current) => ({ ...current, [field]: value }));
      return;
    }
    const id = createId();
    pendingFocusRef.current = { field, id };
    onChange([
      ...editableItems,
      {
        enabled: true,
        id,
        description: field === 'description' ? value : draft.description,
        name: field === 'name' ? value : draft.name,
        value: field === 'value' ? value : draft.value,
      },
    ]);
    setDraft({ description: '', name: '', value: '' });
  };

  /**
   * Creates an editable current-service row from one inherited gateway default.
   *
   * @param item Inherited parameter selected for service-level customization.
   * @returns Nothing; appends a copy with a service-owned identifier.
   */
  const overrideParameter = (item: GlobalHeader) => {
    onChange([...editableItems, { ...item, id: createId() }]);
  };

  /**
   * Removes every editable parameter from the active type and scope.
   *
   * @returns Nothing; inherited gateway defaults remain visible in current-service scope.
   */
  const clearCurrentScope = () => {
    onChange([]);
  };

  return (
    <div className="config-workspace__params">
      <div className="config-workspace__params-toolbar">
        <SegmentedControl
          ariaLabel="全局参数类型"
          mode="tabs"
          className="workspace-segmented--config-parameters"
          value={kind}
          onChange={setKind}
          options={[
            {
              value: 'header',
              label: `Header 请求头 (${getEnabledParameterCount(headerRows.map((row) => row.item))})`,
            },
            {
              value: 'query',
              label: `Query 查询参数 (${getEnabledParameterCount(queryRows.map((row) => row.item))})`,
            },
          ]}
        />
        <DeleteButton
          label="清空当前范围"
          description={`${inGlobalScope ? '网关全局默认' : isAggregation ? '当前服务' : '当前文档'}的 ${editableItems.length} 个 ${kind === 'header' ? 'Header' : 'Query'} 参数将被清空，无法撤销。${isAggregation && !inGlobalScope ? '继承的默认参数将保留。' : ''}`}
          className="config-workspace__clear-parameters"
          disabled={!editableItems.length}
          onConfirm={clearCurrentScope}
        />
      </div>
      <div
        className="config-workspace__table-wrap rare-moving-fields rare-moving-table"
        ref={tableRef}
      >
        <table>
          <thead>
            <tr>
              <th>启用</th>
              <th>{kind === 'header' ? '请求头' : '查询参数'}</th>
              <th>值</th>
              <th>说明</th>
              {isAggregation && <th className="config-workspace__source-column">来源</th>}
              <th aria-label="操作" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ inherited, item, source }) => (
              <tr
                className={inherited ? 'config-workspace__parameter-inherited' : ''}
                key={item.id}
                data-motion-row={item.id}
              >
                <td>
                  <SwitchControl
                    checked={item.enabled !== false}
                    disabled={inherited}
                    label={`${item.enabled !== false ? '禁用' : '启用'} ${item.name || '参数'}`}
                    onChange={(checked) =>
                      onChange(
                        editableItems.map((entry) =>
                          entry.id === item.id ? { ...entry, enabled: checked } : entry,
                        ),
                      )
                    }
                    showState={false}
                  />
                </td>
                <td>
                  <Input
                    disabled={inherited}
                    ref={(element) => {
                      if (element) inputRefs.current.set(`${item.id}:name`, element);
                      else inputRefs.current.delete(`${item.id}:name`);
                    }}
                    onChange={(event) =>
                      onChange(
                        editableItems.map((entry) =>
                          entry.id === item.id ? { ...entry, name: event.target.value } : entry,
                        ),
                      )
                    }
                    placeholder={kind === 'header' ? '请求头名称' : '查询参数名称'}
                    value={item.name}
                  />
                </td>
                <td>
                  <Input
                    disabled={inherited}
                    ref={(element) => {
                      if (element) inputRefs.current.set(`${item.id}:value`, element);
                      else inputRefs.current.delete(`${item.id}:value`);
                    }}
                    onChange={(event) =>
                      onChange(
                        editableItems.map((entry) =>
                          entry.id === item.id ? { ...entry, value: event.target.value } : entry,
                        ),
                      )
                    }
                    placeholder="参数值"
                    value={item.value}
                  />
                </td>
                <td>
                  <Input
                    disabled={inherited}
                    ref={(element) => {
                      if (element) inputRefs.current.set(`${item.id}:description`, element);
                      else inputRefs.current.delete(`${item.id}:description`);
                    }}
                    onChange={(event) =>
                      onChange(
                        editableItems.map((entry) =>
                          entry.id === item.id
                            ? { ...entry, description: event.target.value }
                            : entry,
                        ),
                      )
                    }
                    placeholder="说明（可选）"
                    value={item.description ?? ''}
                  />
                </td>
                {isAggregation && (
                  <td className="config-workspace__source-column">
                    <span
                      className={`config-workspace__source config-workspace__source--${source}`}
                    >
                      {parameterSourceLabels[source]}
                    </span>
                  </td>
                )}
                <td>
                  {inherited ? (
                    <button
                      aria-label={`覆盖 ${item.name || '参数'}`}
                      className="config-workspace__parameter-action config-workspace__parameter-action--override"
                      data-tooltip="覆盖"
                      onClick={() => overrideParameter(item)}
                      type="button"
                    >
                      <IconArrowsExchange aria-hidden="true" size={15} stroke={1.8} />
                    </button>
                  ) : (
                    <DeleteButton
                      compact
                      label={`删除 ${item.name || '参数'}`}
                      description="此参数配置将被删除，无法撤销。"
                      className="config-workspace__parameter-action config-workspace__parameter-action--delete"
                      onConfirm={() =>
                        onChange(editableItems.filter((entry) => entry.id !== item.id))
                      }
                    />
                  )}
                </td>
              </tr>
            ))}
            <tr className="config-workspace__parameter-draft" data-motion-row="draft">
              <td>
                <SwitchControl
                  checked
                  disabled
                  label="新参数默认启用"
                  onChange={() => undefined}
                  showState={false}
                />
              </td>
              <td>
                <Input
                  onChange={(event) => commitDraft('name', event.target.value)}
                  placeholder="输入名称以添加"
                  value={draft.name}
                />
              </td>
              <td>
                <Input
                  onChange={(event) => commitDraft('value', event.target.value)}
                  placeholder="参数值"
                  value={draft.value}
                />
              </td>
              <td>
                <Input
                  onChange={(event) => commitDraft('description', event.target.value)}
                  placeholder="说明（可选）"
                  value={draft.description}
                />
              </td>
              {isAggregation && (
                <td className="config-workspace__source-column">
                  <span
                    className={`config-workspace__source config-workspace__source--${inGlobalScope ? 'global' : 'service'}`}
                  >
                    {parameterSourceLabels[inGlobalScope ? 'global' : 'service']}
                  </span>
                </td>
              )}
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Renders the document-management authentication and global-parameter configuration pages.
 *
 * @param props Credential values, global request state and persistence callbacks for the active service.
 * @returns The selected document-management page for the active OpenAPI document scope.
 */
export function ManagementPage({
  configurationServiceUrl,
  configurationServices,
  globalDefaultHeaders,
  globalDefaultQueryParams,
  globalHeaders,
  globalQueryParams,
  isAggregation,
  onConfigurationServiceChange,
  onGlobalDefaultHeadersChange,
  onGlobalDefaultQueryParamsChange,
  onGlobalHeadersChange,
  onGlobalQueryParamsChange,
  onSecurityValuesChange,
  section,
  securitySchemes,
  securityValues,
}: ManagementPageProps) {
  const [activeSecurityKey, setActiveSecurityKey] = useState<string>();
  const [authFilter, setAuthFilter] = useState<SecurityFilter>('all');
  const [authQuery, setAuthQuery] = useState('');
  const reducedMotion = useReducedMotion();
  const [credentialDraft, setCredentialDraft] = useState('');
  const [showCredentials, setShowCredentials] = useState(false);
  const schemeListRef = useRef<HTMLDivElement | null>(null);
  const schemeItemRefs = useRef(new Map<string, HTMLButtonElement>());
  const [schemeSelectionIndicator, setSchemeSelectionIndicator] =
    useState<SchemeSelectionIndicator>({ height: 0, top: 0, visible: false });
  useEffect(() => {
    setActiveSecurityKey((current) =>
      current && securitySchemes.some((scheme) => scheme.key === current)
        ? current
        : securitySchemes[0]?.key,
    );
  }, [securitySchemes]);
  const activeSecurityScheme = useMemo(
    () => securitySchemes.find((scheme) => scheme.key === activeSecurityKey),
    [activeSecurityKey, securitySchemes],
  );
  useEffect(() => {
    setCredentialDraft(activeSecurityScheme ? securityValues[activeSecurityScheme.key] || '' : '');
  }, [activeSecurityScheme, securityValues]);
  const configuredCount = useMemo(
    () => securitySchemes.filter((scheme) => Boolean(securityValues[scheme.key])).length,
    [securitySchemes, securityValues],
  );
  const filteredSecuritySchemes = useMemo(() => {
    const keyword = authQuery.trim().toLocaleLowerCase();
    return securitySchemes.filter((scheme) => {
      const configured = Boolean(securityValues[scheme.key]);
      if (authFilter === 'configured' && !configured) return false;
      if (authFilter === 'unconfigured' && configured) return false;
      if (!keyword) return true;
      return `${scheme.key} ${scheme.type} ${scheme.scheme || ''} ${scheme.name || ''} ${scheme.in || ''} ${scheme.description || ''}`
        .toLocaleLowerCase()
        .includes(keyword);
    });
  }, [authFilter, authQuery, securitySchemes, securityValues]);
  useEffect(() => {
    if (
      filteredSecuritySchemes.length > 0 &&
      !filteredSecuritySchemes.some((scheme) => scheme.key === activeSecurityKey)
    ) {
      setActiveSecurityKey(filteredSecuritySchemes[0].key);
    }
  }, [activeSecurityKey, filteredSecuritySchemes]);
  /**
   * Measures the active scheme row so one floating selection surface can animate between items.
   *
   * @returns Nothing; updates the selection surface position and height when an active row exists.
   */
  const updateSchemeSelectionIndicator = useCallback(() => {
    const list = schemeListRef.current;
    const item = activeSecurityKey ? schemeItemRefs.current.get(activeSecurityKey) : undefined;
    if (!list || !item) {
      setSchemeSelectionIndicator((current) =>
        current.visible ? { ...current, visible: false } : current,
      );
      return;
    }
    const listBox = list.getBoundingClientRect();
    const itemBox = item.getBoundingClientRect();
    const nextIndicator = {
      height: itemBox.height,
      top: itemBox.top - listBox.top + list.scrollTop,
      visible: true,
    };
    setSchemeSelectionIndicator((current) =>
      current.height === nextIndicator.height &&
      current.top === nextIndicator.top &&
      current.visible === nextIndicator.visible
        ? current
        : nextIndicator,
    );
  }, [activeSecurityKey]);
  useLayoutEffect(() => {
    if (section !== 'auth') {
      setSchemeSelectionIndicator((current) =>
        current.visible ? { ...current, visible: false } : current,
      );
      return;
    }
    const list = schemeListRef.current;
    if (!list) return;
    const frame = globalThis.requestAnimationFrame(updateSchemeSelectionIndicator);
    if (typeof ResizeObserver === 'undefined') {
      return () => globalThis.cancelAnimationFrame(frame);
    }
    const observer = new ResizeObserver(updateSchemeSelectionIndicator);
    observer.observe(list);
    return () => {
      globalThis.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [filteredSecuritySchemes, section, updateSchemeSelectionIndicator]);
  const hasCredentialChanges =
    Boolean(activeSecurityScheme) &&
    credentialDraft !== (securityValues[activeSecurityScheme?.key || ''] || '');

  /**
   * Updates one security credential without discarding other configured schemes.
   *
   * @param key OpenAPI security scheme identifier.
   * @param value Credential text entered for the scheme.
   * @returns Nothing; invokes the parent persistence callback.
   */
  const updateCredential = (key: string, value: string) => {
    const nextValues = { ...securityValues };
    if (value) nextValues[key] = value;
    else delete nextValues[key];
    onSecurityValuesChange(nextValues);
  };

  const [parameterScope, setParameterScope] = useState<ParameterScope>(() =>
    isAggregation ? 'global' : 'service',
  );
  useEffect(() => {
    setParameterScope(isAggregation ? 'global' : 'service');
  }, [isAggregation]);

  /**
   * Selects the shared-default or current-service parameter scope.
   *
   * @param scope Requested aggregation parameter scope.
   * @returns Nothing; updates the editor scope and loads the first available service when required.
   */
  const selectParameterScope = (scope: ParameterScope) => {
    setParameterScope(scope);
    if (scope === 'service' && !configurationServiceUrl) {
      const firstService = configurationServices.find((service) => !service.disabled);
      if (firstService) onConfigurationServiceChange(firstService.url);
    }
  };

  /**
   * Loads another aggregation service while preserving current-service editing mode.
   *
   * @param serviceUrl URL of the service selected from the gateway service menu.
   * @returns Nothing; requests a workspace service change when the selection differs.
   */
  const selectConfigurationService = (serviceUrl: string) => {
    if (serviceUrl !== configurationServiceUrl) onConfigurationServiceChange(serviceUrl);
  };

  if (section === 'config') {
    const configurationServiceValue =
      configurationServiceUrl ||
      configurationServices.find((service) => !service.disabled)?.url ||
      '';
    return (
      <div className="legacy-config config-workspace">
        <section className="config-workspace__mode-card">
          <div className="config-workspace__mode-heading">
            <span className="config-workspace__mode-icon">
              {isAggregation ? (
                <IconServer aria-hidden="true" size={18} stroke={1.8} />
              ) : (
                <IconDeviceDesktop aria-hidden="true" size={18} stroke={1.8} />
              )}
            </span>
            <span className="config-workspace__mode-copy">
              <b>{isAggregation ? '网关聚合模式' : '单体应用模式'}</b>
              <span>
                {isAggregation ? `${configurationServices.length} 个服务可用` : '当前文档运行正常'}
              </span>
            </span>
          </div>
          <div className="config-workspace__mode-actions">
            <span className="config-workspace__saved">已自动保存</span>
            {isAggregation && (
              <>
                {parameterScope === 'service' && (
                  <SelectMenu
                    ariaLabel="选择当前服务"
                    className="config-workspace__scope-select"
                    disabled={configurationServices.length === 0}
                    onChange={selectConfigurationService}
                    options={configurationServices.map((service) => ({
                      disabled: service.disabled,
                      label: `${service.name}${service.disabled ? '（不可用）' : ''}`,
                      value: service.url,
                    }))}
                    value={configurationServiceValue}
                  />
                )}
                <SegmentedControl
                  ariaLabel="参数作用域"
                  mode="tabs"
                  className="workspace-segmented--config-scope"
                  value={parameterScope}
                  onChange={selectParameterScope}
                  options={[
                    { value: 'global', label: '全部服务默认' },
                    {
                      value: 'service',
                      label: '当前服务',
                      disabled: configurationServices.length === 0,
                    },
                  ]}
                />
              </>
            )}
          </div>
        </section>
        <section className="config-workspace__sheet">
          <GlobalParamsEditor
            globalHeaders={globalDefaultHeaders}
            globalQueryParams={globalDefaultQueryParams}
            headers={globalHeaders}
            isAggregation={isAggregation}
            onGlobalHeadersChange={onGlobalDefaultHeadersChange}
            onGlobalQueryChange={onGlobalDefaultQueryParamsChange}
            onHeadersChange={onGlobalHeadersChange}
            onQueryChange={onGlobalQueryParamsChange}
            queryParams={globalQueryParams}
            scope={parameterScope}
          />
        </section>
      </div>
    );
  }

  return (
    <div className="auth-workspace">
      <div className="auth-workspace__shell">
        <header className="auth-workspace__header auth-workspace__header-compact">
          <DeleteButton
            label="清除全部凭据"
            description={`当前${isAggregation ? '服务' : '文档'}已配置的 ${configuredCount} 个认证凭据将被清除，需要重新填写。`}
            className="auth-workspace__clear-all"
            disabled={configuredCount === 0}
            onConfirm={() => {
              onSecurityValuesChange({});
              setCredentialDraft('');
            }}
          />
        </header>

        {securitySchemes.length > 0 ? (
          <div className="auth-workspace__content">
            <aside aria-label="认证方案" className="auth-workspace__scheme-nav">
              <div className="auth-workspace__scheme-nav-header">
                <div>
                  <b>认证方案</b>
                  <span>
                    {configuredCount} / {securitySchemes.length} 已配置
                  </span>
                </div>
                <SegmentedControl<SecurityFilter>
                  ariaLabel="认证方案筛选"
                  mode="tabs"
                  className="auth-workspace__scheme-filters"
                  value={authFilter}
                  onChange={setAuthFilter}
                  options={[
                    { value: 'all', label: `全部 ${securitySchemes.length}` },
                    { value: 'configured', label: `已配置 ${configuredCount}` },
                    {
                      value: 'unconfigured',
                      label: `待配置 ${securitySchemes.length - configuredCount}`,
                    },
                  ]}
                />
                <label className="auth-workspace__scheme-search ui-input-shell">
                  <IconSearch aria-hidden="true" size={14} stroke={1.8} />
                  <Input
                    variant="embedded"
                    onChange={(event) => setAuthQuery(event.target.value)}
                    placeholder="搜索方案、协议或字段"
                    type="search"
                    value={authQuery}
                  />
                </label>
              </div>
              <div className="auth-workspace__scheme-list" ref={schemeListRef}>
                <motion.span
                  aria-hidden="true"
                  className={`auth-workspace__scheme-selection ${schemeSelectionIndicator.visible ? 'is-visible' : ''}`}
                  initial={false}
                  animate={{
                    height: schemeSelectionIndicator.height,
                    top: schemeSelectionIndicator.top,
                  }}
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 420, damping: 34 }
                  }
                  style={{ transition: 'none' }}
                />
                {filteredSecuritySchemes.map((scheme) => {
                  const configured = Boolean(securityValues[scheme.key]);
                  const active = scheme.key === activeSecurityScheme?.key;
                  return (
                    <button
                      aria-current={active ? 'page' : undefined}
                      className={`auth-workspace__scheme-item ${active ? 'is-active' : ''}`}
                      key={scheme.key}
                      onClick={() => setActiveSecurityKey(scheme.key)}
                      ref={(element) => {
                        if (element) schemeItemRefs.current.set(scheme.key, element);
                        else schemeItemRefs.current.delete(scheme.key);
                      }}
                      type="button"
                    >
                      <span className="auth-workspace__scheme-copy">
                        <span>
                          <b>{scheme.key}</b>
                          <em className={configured ? 'is-configured' : ''}>
                            {configured ? '已配置' : '待配置'}
                          </em>
                        </span>
                        <small>
                          {getSecuritySchemeLabel(scheme)} · {getSecurityInjectionTarget(scheme)}
                        </small>
                      </span>
                    </button>
                  );
                })}
                {filteredSecuritySchemes.length === 0 && (
                  <p className="auth-workspace__scheme-empty">没有匹配的认证方案</p>
                )}
              </div>
            </aside>

            <section className="auth-workspace__detail">
              {activeSecurityScheme ? (
                <>
                  <header className="auth-workspace__detail-header">
                    <div>
                      <span className="auth-workspace__detail-icon">
                        {activeSecurityScheme.type === 'apiKey' ? (
                          <IconKey aria-hidden="true" size={18} stroke={1.8} />
                        ) : (
                          <IconLock aria-hidden="true" size={18} stroke={1.8} />
                        )}
                      </span>
                      <div>
                        <div className="auth-workspace__detail-title-row">
                          <h2>{activeSecurityScheme.key}</h2>
                          <span className="auth-workspace__injection-target">
                            注入目标：{getSecurityInjectionTarget(activeSecurityScheme)}
                          </span>
                        </div>
                        {activeSecurityScheme.description && (
                          <p>{activeSecurityScheme.description}</p>
                        )}
                      </div>
                    </div>
                    <span className="auth-workspace__scheme-type">
                      {getSecuritySchemeLabel(activeSecurityScheme)}
                    </span>
                  </header>
                  <div className="auth-workspace__detail-body">
                    <div className="auth-workspace__credential-primary">
                      <div className="auth-workspace__field-heading">
                        <b>认证凭据 (Credential Value)</b>
                      </div>
                      <div className="auth-workspace__credential-row">
                        <div className="auth-workspace__credential-input ui-input-shell">
                          <Input
                            variant="embedded"
                            onChange={(event) => setCredentialDraft(event.target.value)}
                            placeholder={getSecurityPlaceholder(activeSecurityScheme)}
                            type={showCredentials ? 'text' : 'password'}
                            value={credentialDraft}
                          />
                          <button
                            aria-label={showCredentials ? '隐藏凭据' : '显示凭据'}
                            onClick={() => setShowCredentials((current) => !current)}
                            title={showCredentials ? '隐藏凭据' : '显示凭据'}
                            type="button"
                          >
                            {showCredentials ? (
                              <IconEyeOff aria-hidden="true" size={17} stroke={1.8} />
                            ) : (
                              <IconEye aria-hidden="true" size={17} stroke={1.8} />
                            )}
                          </button>
                        </div>
                        <button
                          className="auth-workspace__credential-save"
                          disabled={!hasCredentialChanges}
                          onClick={() =>
                            updateCredential(activeSecurityScheme.key, credentialDraft.trim())
                          }
                          type="button"
                        >
                          保存凭据
                        </button>
                        <button
                          className="auth-workspace__credential-clear"
                          disabled={!securityValues[activeSecurityScheme.key] && !credentialDraft}
                          onClick={() => {
                            updateCredential(activeSecurityScheme.key, '');
                            setCredentialDraft('');
                          }}
                          type="button"
                        >
                          清空
                        </button>
                      </div>
                      <p className="auth-workspace__credential-helper">
                        在线调试会自动写入 {getSecurityInjectionTarget(activeSecurityScheme)}。
                      </p>
                    </div>
                    <section className="auth-workspace__scheme-definition">
                      <b>OpenAPI 方案声明</b>
                      <pre>{getSecuritySchemeDefinition(activeSecurityScheme)}</pre>
                    </section>
                  </div>
                </>
              ) : (
                <p className="auth-workspace__detail-empty">请选择一个认证方案</p>
              )}
            </section>
          </div>
        ) : (
          <p className="auth-workspace__empty">当前文档没有声明认证方案。</p>
        )}
      </div>
    </div>
  );
}
