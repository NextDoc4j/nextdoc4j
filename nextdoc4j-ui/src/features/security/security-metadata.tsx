import { IconChevronDown, IconLock, IconShield } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import { HeroCopyButton } from '../../components/rare-ui/hero-copy-button';
import { getOperationSecurityRequirements } from './security';
import { getSecurityMetadataDisplay, type SecurityRuleDisplay } from './metadata';
import type { ApiOperation, OpenApiDocument, SecurityScheme } from '../../types/openapi';

interface SecurityMetadataProps {
  document: OpenApiDocument;
  operation: ApiOperation;
}

interface AuthenticationMethod {
  description?: string;
  in: string;
  key: string;
  label: string;
  name: string;
}

/**
 * Converts one OpenAPI security scheme into the compact row shown in the operation hero.
 *
 * @param key Security requirement key declared by the selected operation.
 * @param scheme Resolved OpenAPI security scheme, when present in the document registry.
 * @returns Display label, parameter location and parameter name.
 */
const getAuthenticationMethod = (key: string, scheme?: SecurityScheme): AuthenticationMethod => {
  if (!scheme) {
    return {
      description: undefined,
      in: 'header',
      key,
      label: key,
      name: key,
    };
  }
  if (scheme.type === 'apiKey') {
    return {
      description: scheme.description,
      in: scheme.in || 'header',
      key,
      label: 'API Key',
      name: scheme.name || key,
    };
  }
  if (scheme.type === 'http' && scheme.scheme?.toLowerCase() === 'bearer') {
    return {
      description: scheme.description,
      in: 'header',
      key,
      label: 'Bearer Token',
      name: scheme.name || 'Authorization',
    };
  }
  return {
    description: scheme.description,
    in: scheme.in || 'header',
    key,
    label: scheme.type || key,
    name: scheme.name || key,
  };
};

const ruleMode = (rule: SecurityRuleDisplay) => (rule.connector === '或' ? 'OR' : 'AND');

function SecurityRuleRows({ rules }: { rules: SecurityRuleDisplay[] }) {
  return (
    <div className="security-rules-well">
      {rules.map((rule, ruleIndex) => (
        <div className="security-rule-row" key={`${rule.label}-${ruleIndex}`}>
          <div className="security-rule-row__meta">
            <span className={`security-rule-kind security-rule-kind--${rule.kind}`}>
              {rule.label}
            </span>
            <span
              className="security-rule-badge"
              title={rule.connector === '或' ? '满足任意一项即可' : '必须同时满足所有项'}
            >
              {ruleMode(rule)}
            </span>
          </div>
          <div className="security-rule-values">
            {rule.values.map((value, index) => (
              <span className="security-rule-value" key={`${value}-${index}`}>
                {index > 0 && <span className="security-connector">{rule.connector}</span>}
                <HeroCopyButton
                  className="security-code-chip"
                  copiedMessage={`权限标识 ${value} 已复制`}
                  text={value}
                  title={`点击复制：${value}`}
                >
                  <span>{value}</span>
                </HeroCopyButton>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Displays authentication schemes and NextDoc4j Sa-Token metadata in the unified hero layout.
 *
 * @param props Active OpenAPI document and selected operation.
 * @returns Expandable, copyable security metadata rows.
 */
export function SecurityMetadata({ document, operation }: SecurityMetadataProps) {
  const metadata = getSecurityMetadataDisplay(operation);
  const [authExpanded, setAuthExpanded] = useState(true);
  const [saExpanded, setSaExpanded] = useState(true);
  const requirements = getOperationSecurityRequirements(operation);
  const authenticationMethods = [...new Set(requirements.flatMap(Object.keys))].map((key) =>
    getAuthenticationMethod(key, document.components?.securitySchemes?.[key]),
  );
  const identity = `${operation.method}:${operation.path}`;

  useEffect(() => {
    setAuthExpanded(true);
    setSaExpanded(true);
  }, [identity]);

  const permissionRules = metadata?.rules.filter((rule) => rule.kind === 'permission') ?? [];
  const roleRules = metadata?.rules.filter((rule) => rule.kind === 'role') ?? [];
  const permissionCount = permissionRules.reduce((total, rule) => total + rule.values.length, 0);
  const roleCount = roleRules.reduce((total, rule) => total + rule.values.length, 0);

  return (
    <div className="hero-security">
      <div className="security-row">
        <span className="security-row__label">
          <IconLock aria-hidden="true" size={13.5} stroke={1.8} />
          认证方式
        </span>
        <div className="security-row__body">
          {authenticationMethods.length === 0 ? (
            <div className="security-bar">
              <div className="security-summary-list">
                <span
                  className={`security-summary-pill ${metadata && !metadata.ignored ? 'security-summary-pill--warn' : 'security-summary-pill--open'}`}
                >
                  {metadata && !metadata.ignored ? '未声明认证方式' : '无需认证'}
                </span>
              </div>
            </div>
          ) : (
            <>
              <button
                aria-expanded={authExpanded}
                className="security-bar security-bar--toggle"
                onClick={() => setAuthExpanded((value) => !value)}
                type="button"
              >
                <div className="security-summary-list">
                  <span className="security-summary-pill security-summary-pill--auth">
                    {authenticationMethods.length} 种认证方式
                  </span>
                </div>
                <IconChevronDown aria-hidden="true" size={13} stroke={1.8} />
              </button>
              <div className={`security-body-wrap${authExpanded ? ' is-open' : ''}`}>
                <div className="security-rules-well">
                  {authenticationMethods.map((method) => (
                    <div className="security-rule-row" key={method.key}>
                      <div className="security-rule-row__meta">
                        <span className="security-rule-kind security-rule-kind--auth">
                          {method.label}
                        </span>
                        <span className="security-rule-badge" title={`参数传递位置：${method.in}`}>
                          {method.in}
                        </span>
                      </div>
                      <div className="security-rule-values">
                        <HeroCopyButton
                          className="security-code-chip"
                          copiedMessage={`认证参数名 ${method.name} 已复制`}
                          text={method.name}
                          title={`点击复制参数名：${method.name}`}
                        >
                          <span>{method.name}</span>
                        </HeroCopyButton>
                        <span className="security-rule-desc">
                          {method.description?.trim() || '暂无认证描述'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {metadata && (
        <div className="security-row">
          <span className="security-row__label">
            <IconShield aria-hidden="true" size={13.5} stroke={1.8} />
            Sa-Token
          </span>
          <div className="security-row__body">
            {metadata.ignored ? (
              <div className="security-bar">
                <div className="security-summary-list">
                  <span className="security-summary-pill security-summary-pill--open">
                    跳过校验 · @SaIgnore
                  </span>
                </div>
              </div>
            ) : (
              <>
                <button
                  aria-expanded={saExpanded}
                  className="security-bar security-bar--toggle"
                  onClick={() => setSaExpanded((value) => !value)}
                  type="button"
                >
                  <div className="security-summary-list">
                    {permissionCount > 0 && (
                      <span className="security-summary-pill security-summary-pill--perm">
                        {permissionCount} 项权限
                      </span>
                    )}
                    {roleCount > 0 && (
                      <span className="security-summary-pill security-summary-pill--role">
                        {roleCount} 项
                        {roleRules.some((rule) => rule.label.includes('备选'))
                          ? '备选角色'
                          : '角色'}
                      </span>
                    )}
                  </div>
                  <IconChevronDown aria-hidden="true" size={13} stroke={1.8} />
                </button>
                <div className={`security-body-wrap${saExpanded ? ' is-open' : ''}`}>
                  <SecurityRuleRows rules={metadata.rules} />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
