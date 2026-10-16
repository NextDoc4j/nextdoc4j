import type { NextdocSecurityRule, Operation } from '../../types/openapi';

export type SecurityRuleKind = 'permission' | 'role';

export interface SecurityRuleDisplay {
  connector: '且' | '或';
  kind: SecurityRuleKind;
  label: string;
  values: string[];
}

export interface SecurityMetadataDisplay {
  ignored: boolean;
  rules: SecurityRuleDisplay[];
}

const normalizeValues = (values?: string[]) =>
  Array.isArray(values)
    ? values
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean)
    : [];

const getRuleKind = (value?: string): SecurityRuleKind =>
  value?.trim().toLowerCase() === 'role' ? 'role' : 'permission';

const getRuleLabel = (kind: SecurityRuleKind, alternate = false) => {
  const baseLabel = kind === 'role' ? '角色' : '权限';
  return alternate ? `备选${baseLabel}` : baseLabel;
};

const getRuleConnector = (mode?: string): SecurityRuleDisplay['connector'] =>
  mode?.trim().toUpperCase() === 'OR' ? '或' : '且';

/**
 * Converts one Sa-Token or compatible security rule into display-ready values.
 *
 * @param rule OpenAPI extension rule containing values, mode and optional alternative values.
 * @param defaultKind Rule kind inferred from the extension collection.
 * @returns Primary and alternative display rows after malformed values are removed.
 */
const createRuleDisplays = (
  rule: NextdocSecurityRule,
  defaultKind: SecurityRuleKind,
): SecurityRuleDisplay[] => {
  const kind = getRuleKind(rule.type) === 'role' ? 'role' : defaultKind;
  const connector = getRuleConnector(rule.mode);
  const values = normalizeValues(rule.values);
  const alternateValues = normalizeValues(rule.orValues);
  const alternateKind = getRuleKind(rule.orType);

  return [
    ...(values.length ? [{ connector, kind, label: getRuleLabel(kind), values }] : []),
    ...(alternateValues.length
      ? [
          {
            connector,
            kind: alternateKind,
            label: getRuleLabel(alternateKind, true),
            values: alternateValues,
          },
        ]
      : []),
  ];
};

/**
 * Reads operation-level Sa-Token metadata from the NextDoc4j OpenAPI extension.
 *
 * @param operation OpenAPI operation that may contain x-nextdoc4j-security metadata.
 * @returns Display metadata, or undefined when the operation has no visible security annotation.
 */
export const getSecurityMetadataDisplay = (
  operation: Operation,
): SecurityMetadataDisplay | undefined => {
  const metadata = operation['x-nextdoc4j-security'];
  if (!metadata) return undefined;
  if (metadata.ignore === true) return { ignored: true, rules: [] };

  const rules = [
    ...(metadata.permissions ?? []).flatMap((rule) => createRuleDisplays(rule, 'permission')),
    ...(metadata.roles ?? []).flatMap((rule) => createRuleDisplays(rule, 'role')),
  ];
  return rules.length ? { ignored: false, rules } : undefined;
};
