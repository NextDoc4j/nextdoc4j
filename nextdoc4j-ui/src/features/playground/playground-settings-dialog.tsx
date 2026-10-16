import { DeleteButton } from '../../components/rare-ui/delete-button';
import { Input } from '../../components/input';
import { createId } from '../../lib/id';
import { useEffect, useRef, useState } from 'react';

import { Modal } from '../../components/modal';
import { SegmentedControl } from '../../components/segmented-control';
import { ContentTransition } from '../../components/rare-ui/content-transition';
import { SwitchControl } from '../../components/switch-control';
import type { GlobalHeader } from './types';
import type { ResolvedSecurityScheme } from '../security/security';

type SettingsTab = 'auth' | 'headers' | 'query' | 'request';

interface PlaygroundSettingsDialogProps {
  credentials: boolean;
  globalHeaders: GlobalHeader[];
  globalQueryParams: GlobalHeader[];
  onClose: () => void;
  onCredentialsChange: (value: boolean) => void;
  onGlobalHeadersChange: (value: GlobalHeader[]) => void;
  onGlobalQueryParamsChange: (value: GlobalHeader[]) => void;
  onSecurityValuesChange: (values: Record<string, string>) => void;
  onTimeoutChange: (value: number) => void;
  securitySchemes: ResolvedSecurityScheme[];
  securityValues: Record<string, string>;
  timeoutSeconds: number;
}

const tabs: Array<{ label: string; value: SettingsTab }> = [
  { label: '全局认证', value: 'auth' },
  { label: '全局 Query', value: 'query' },
  { label: '全局 Headers', value: 'headers' },
  { label: '请求设置', value: 'request' },
];

/**
 * Describes how a security scheme is attached to the outgoing request.
 *
 * @param scheme Resolved OpenAPI security scheme.
 * @returns Compact scheme and injection-target label.
 */
const getSecurityLabel = (scheme: ResolvedSecurityScheme) => {
  if (scheme.type === 'apiKey') {
    return `${scheme.type} · ${scheme.in || 'header'} · ${scheme.name || scheme.key}`;
  }
  return `${scheme.type}${scheme.scheme ? ` · ${scheme.scheme}` : ''} · Header`;
};

/**
 * Renders the document-management style global parameter table with a permanent draft row.
 *
 * @param props Active Header or Query collection and its controlled update callback.
 * @returns Switch rows, name/value editors, trash actions and a final row that creates the next row.
 */
function QuickGlobalParams({
  kind,
  items,
  onChange,
}: {
  kind: 'headers' | 'query';
  items: GlobalHeader[];
  onChange: (items: GlobalHeader[]) => void;
}) {
  const [draft, setDraft] = useState({ name: '', value: '' });
  const inputRefs = useRef(new Map<string, HTMLInputElement>());
  const pendingFocusRef = useRef<{ field: 'name' | 'value'; id: string } | undefined>(undefined);

  useEffect(() => {
    setDraft({ name: '', value: '' });
  }, [kind]);
  useEffect(() => {
    const pending = pendingFocusRef.current;
    if (!pending) return;
    const input = inputRefs.current.get(`${pending.id}:${pending.field}`);
    if (!input) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    pendingFocusRef.current = undefined;
  }, [items]);

  /**
   * Updates one existing global parameter without replacing unrelated rows.
   *
   * @param id Stable parameter identifier.
   * @param patch Name, value or enabled state to apply.
   * @returns Nothing; publishes the complete updated collection.
   */
  const update = (id: string, patch: Partial<GlobalHeader>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  /**
   * Converts the final draft row into a persisted row after its first non-empty input.
   *
   * @param field Draft field being edited.
   * @param value Current draft input value.
   * @returns Nothing; appends the row and keeps editing focus on the created field.
   */
  const commitDraft = (field: 'name' | 'value', value: string) => {
    if (!value.trim()) {
      setDraft((current) => ({ ...current, [field]: value }));
      return;
    }
    const id = createId();
    pendingFocusRef.current = { field, id };
    onChange([
      ...items,
      {
        enabled: true,
        id,
        name: field === 'name' ? value : draft.name,
        value: field === 'value' ? value : draft.value,
      },
    ]);
    setDraft({ name: '', value: '' });
  };

  return (
    <div className="playground-settings__params-table">
      <table>
        <thead>
          <tr>
            <th>启用</th>
            <th>{kind === 'headers' ? '请求头' : '查询参数'}</th>
            <th>值</th>
            <th aria-label="操作" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <SwitchControl
                  checked={item.enabled !== false}
                  label={`${item.enabled !== false ? '禁用' : '启用'} ${item.name || '参数'}`}
                  onChange={(checked) => update(item.id, { enabled: checked })}
                  showState={false}
                />
              </td>
              <td>
                <Input
                  onChange={(event) => update(item.id, { name: event.target.value })}
                  placeholder={kind === 'headers' ? '请求头名称' : '查询参数名称'}
                  ref={(element) => {
                    if (element) inputRefs.current.set(`${item.id}:name`, element);
                    else inputRefs.current.delete(`${item.id}:name`);
                  }}
                  value={item.name}
                />
              </td>
              <td>
                <Input
                  onChange={(event) => update(item.id, { value: event.target.value })}
                  placeholder="参数值"
                  ref={(element) => {
                    if (element) inputRefs.current.set(`${item.id}:value`, element);
                    else inputRefs.current.delete(`${item.id}:value`);
                  }}
                  value={item.value}
                />
              </td>
              <td>
                <DeleteButton
                  compact
                  label={`删除 ${item.name || '参数'}`}
                  description="此全局参数将被删除，无法撤销。"
                  onConfirm={() => onChange(items.filter((entry) => entry.id !== item.id))}
                />
              </td>
            </tr>
          ))}
          <tr className="is-draft">
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
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/**
 * Edits global credentials, Query, Headers and request behavior from the online debugger.
 *
 * @param props Current workspace settings and controlled change callbacks.
 * @returns A modal with a small left menu and changes applied immediately to the active workspace.
 */
export function PlaygroundSettingsDialog({
  credentials,
  globalHeaders,
  globalQueryParams,
  onClose,
  onCredentialsChange,
  onGlobalHeadersChange,
  onGlobalQueryParamsChange,
  onSecurityValuesChange,
  onTimeoutChange,
  securitySchemes,
  securityValues,
  timeoutSeconds,
}: PlaygroundSettingsDialogProps) {
  const [tab, setTab] = useState<SettingsTab>('auth');

  const activeGlobals = tab === 'headers' ? globalHeaders : globalQueryParams;
  const activeKind = tab === 'headers' ? 'headers' : 'query';

  return (
    <Modal
      mobileSheet
      open
      onClose={onClose}
      title="请求设置"
      size="wide"
      className="playground-settings"
      bodyClassName="playground-settings__body"
    >
      <div className="playground-settings__layout">
        <nav aria-label="快捷设置分类">
          <SegmentedControl<SettingsTab>
            ariaLabel="快捷设置分类"
            className="playground-settings__menu"
            onChange={setTab}
            options={tabs}
            orientation="vertical"
            value={tab}
          />
        </nav>
        <ContentTransition
          as="section"
          transitionKey={tab}
          className="playground-settings__content"
        >
          <header>
            <h3>{tabs.find((item) => item.value === tab)?.label}</h3>
            <span>{tab === 'request' ? '仅影响当前调试' : '修改全局配置，本次覆盖保持不变'}</span>
          </header>
          {tab === 'auth' ? (
            <div className="playground-settings__auth">
              {securitySchemes.length ? (
                securitySchemes.map((scheme) => (
                  <label key={scheme.key}>
                    <span>
                      <strong>{scheme.key}</strong>
                      <small>{getSecurityLabel(scheme)}</small>
                    </span>
                    <Input
                      aria-label={`${scheme.key} 认证凭据`}
                      onChange={(event) =>
                        onSecurityValuesChange({
                          ...securityValues,
                          [scheme.key]: event.target.value,
                        })
                      }
                      placeholder={
                        scheme.type === 'http' && scheme.scheme?.toLowerCase() === 'basic'
                          ? '用户名:密码'
                          : `填写 ${scheme.bearerFormat || scheme.name || '凭据'}`
                      }
                      type="password"
                      value={securityValues[scheme.key] || ''}
                    />
                  </label>
                ))
              ) : (
                <p>当前文档未声明认证方式。</p>
              )}
            </div>
          ) : tab === 'headers' || tab === 'query' ? (
            <QuickGlobalParams
              items={activeGlobals}
              kind={activeKind}
              onChange={
                activeKind === 'headers' ? onGlobalHeadersChange : onGlobalQueryParamsChange
              }
            />
          ) : (
            <div className="playground-settings__request">
              <label>
                <span>
                  <strong>请求超时</strong>
                  <small>超过时间后自动取消当前请求</small>
                </span>
                <span className="playground-settings__timeout">
                  <Input
                    aria-label="请求超时秒数"
                    max={120}
                    min={1}
                    onChange={(event) =>
                      onTimeoutChange(Math.max(1, Math.min(120, Number(event.target.value) || 30)))
                    }
                    type="number"
                    value={timeoutSeconds}
                  />
                  秒
                </span>
              </label>
              <label>
                <span>
                  <strong>携带浏览器凭据</strong>
                  <small>受同源、SameSite 与服务端跨域策略约束</small>
                </span>
                <SwitchControl
                  checked={credentials}
                  label={`${credentials ? '关闭' : '开启'}携带浏览器凭据`}
                  onChange={onCredentialsChange}
                  showState={false}
                />
              </label>
            </div>
          )}
        </ContentTransition>
      </div>
    </Modal>
  );
}
