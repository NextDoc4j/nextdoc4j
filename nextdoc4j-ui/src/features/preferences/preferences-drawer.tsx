import { DeleteButton } from '../../components/rare-ui/delete-button';
import { AnimatedCounter } from '../../components/rare-ui/animated-counter';
import { useNotification } from '../../lib/notifications';
import { useEffect, useState, type ReactNode } from 'react';

import {
  IconAdjustments,
  IconCopyright,
  IconDatabase,
  IconFileText,
  IconLayoutSidebar,
  IconPalette,
  IconRefresh,
  IconServer,
} from '@tabler/icons-react';

import { Modal } from '../../components/modal';
import { SelectMenu } from '../../components/select-menu';
import { SegmentedControl } from '../../components/segmented-control';
import { ContentTransition } from '../../components/rare-ui/content-transition';
import { SwitchControl } from '../../components/switch-control';
import type { ServiceDefinition } from '../../types/openapi';
import type {
  ContentWidthPreference,
  NavigationExpansionPreference,
  UserPreferences,
} from './storage';
import type { ThemePreference } from '../workspace/browser-preferences';
import { CopyrightText } from './copyright-text';

type PreferenceTab = 'general' | 'nextdoc4j';

interface PreferencesDrawerProps {
  allDebugCacheEnabled: boolean;
  allGroupOverviewEnabled: boolean;
  brandFooterText?: string;
  configurationServiceUrl?: string;
  configurationServices: ServiceDefinition[];
  debugCacheEnabled: boolean;
  getAllDebugDraftCount: () => Promise<number>;
  getDebugDraftCount: () => Promise<number>;
  groupOverviewEnabled: boolean;
  isAggregation: boolean;
  onAllDebugCacheEnabledChange: (enabled: boolean) => void;
  onAllGroupOverviewEnabledChange: (enabled: boolean) => void;
  onChange: (preferences: UserPreferences) => void;
  onClearAllDebugDrafts: () => Promise<number>;
  onClearDebugDrafts: () => Promise<number>;
  onClose: () => void;
  onDebugCacheEnabledChange: (enabled: boolean) => void;
  onGroupOverviewEnabledChange: (enabled: boolean) => void;
  onReset: () => void;
  open: boolean;
  operationGroupCount: number;
  preferences: UserPreferences;
  unavailableServiceCount: number;
}

interface PreferenceSectionProps {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}

/**
 * Renders one titled group of related preference cards.
 *
 * @param props Section icon, title, description, and preference controls.
 * @returns A consistently spaced preference section.
 */
function PreferenceSection({ children, icon, title }: PreferenceSectionProps) {
  return (
    <section className="preferences-section">
      <header className="preferences-section__header">
        {icon}
        <h2>{title}</h2>
      </header>
      {children}
    </section>
  );
}

/**
 * Renders the shared preference row used inside one floating setting card.
 *
 * @param props Preference title, explanatory text, and control element.
 * @returns A two-column preference row.
 */
function PreferenceRow({ control, title }: { control: ReactNode; title: string }) {
  return (
    <div className="preferences-row">
      <div>
        <b>{title}</b>
      </div>
      {control}
    </div>
  );
}

/**
 * Renders general and Nextdoc4j-specific preferences in a two-tab right drawer.
 *
 * @param props Persisted preferences, runtime status, scoped behavior callbacks, and drawer state.
 * @returns A modal preference drawer with a fixed reset action.
 */
export function PreferencesDrawer({
  allDebugCacheEnabled,
  allGroupOverviewEnabled,
  brandFooterText,
  configurationServiceUrl,
  configurationServices,
  debugCacheEnabled,
  getAllDebugDraftCount,
  getDebugDraftCount,
  groupOverviewEnabled,
  isAggregation,
  onAllDebugCacheEnabledChange,
  onAllGroupOverviewEnabledChange,
  onChange,
  onClearAllDebugDrafts,
  onClearDebugDrafts,
  onClose,
  onDebugCacheEnabledChange,
  onGroupOverviewEnabledChange,
  onReset,
  open,
  operationGroupCount,
  preferences,
  unavailableServiceCount,
}: PreferencesDrawerProps) {
  const [activeTab, setActiveTab] = useState<PreferenceTab>('general');
  const [scopeValue, setScopeValue] = useState(() => (isAggregation ? '__all__' : '__current__'));
  const [draftCount, setDraftCount] = useState(0);
  const [clearingDrafts, setClearingDrafts] = useState(false);
  const setActionMessage = useNotification();
  const allServicesScope = isAggregation && scopeValue === '__all__';
  const displayedDebugCacheEnabled = allServicesScope ? allDebugCacheEnabled : debugCacheEnabled;
  const displayedGroupOverviewEnabled = allServicesScope
    ? allGroupOverviewEnabled
    : groupOverviewEnabled;
  const activeServiceName =
    configurationServices.find((service) => service.url === configurationServiceUrl)?.name ||
    '当前文档';

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (allServicesScope ? getAllDebugDraftCount() : getDebugDraftCount())
      .then((count) => {
        if (!cancelled) setDraftCount(count);
      })
      .catch(() => {
        if (!cancelled) setActionMessage('无法读取调试缓存，请重试');
      });
    return () => {
      cancelled = true;
    };
  }, [
    allServicesScope,
    configurationServiceUrl,
    getAllDebugDraftCount,
    getDebugDraftCount,
    open,
    setActionMessage,
  ]);

  useEffect(() => {
    if (!isAggregation) setScopeValue('__current__');
  }, [isAggregation]);

  const [hasOpened, setHasOpened] = useState(open);

  useEffect(() => {
    if (open) setHasOpened(true);
  }, [open]);

  if (!hasOpened && !open) return null;

  /**
   * Updates one general preference without replacing unrelated persisted values.
   *
   * @param patch Preference fields changed by the active control.
   * @returns Nothing; emits a complete preference record to the workspace.
   */
  const updatePreferences = (patch: Partial<UserPreferences>) => {
    onChange({ ...preferences, ...patch });
  };

  /**
   * Selects the aggregation-wide or current-service preference scope.
   *
   * @param value All-services or current-service marker selected in the drawer.
   * @returns Nothing; updates the displayed scoped settings.
   */
  const selectScope = (value: string) => {
    if (!clearingDrafts) setScopeValue(value);
  };

  /**
   * Clears debug drafts only for the currently displayed service scope.
   *
   * @returns Nothing; clears storage, updates the visible count, and announces the result.
   */
  const clearCurrentDrafts = async () => {
    setClearingDrafts(true);
    try {
      const count = await (allServicesScope ? onClearAllDebugDrafts() : onClearDebugDrafts());
      setDraftCount(0);
      setActionMessage(count > 0 ? `已清理 ${count} 个调试草稿` : '当前范围没有调试草稿');
    } catch (error) {
      setActionMessage('清理调试缓存失败，原数据已保留，请重试');
      throw error;
    } finally {
      setClearingDrafts(false);
    }
  };

  /**
   * Restores general and Nextdoc4j behavior preferences without clearing user data.
   *
   * @returns Nothing; delegates reset behavior and refreshes the displayed setting scope.
   */
  const restoreDefaults = () => {
    onReset();
    setActionMessage('偏好设置已恢复默认值');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="偏好设置"
      description="修改后自动保存到当前浏览器"
      placement="drawer"
      busy={clearingDrafts}
      mobileSheet
      className="preferences-drawer"
      bodyClassName="preferences-drawer__body"
      footer={
        <>
          <button disabled={clearingDrafts} onClick={restoreDefaults} type="button">
            <IconRefresh aria-hidden="true" size={14} stroke={1.8} />
            恢复默认偏好
          </button>
        </>
      }
    >
      <div className="preferences-tabs">
        <SegmentedControl<PreferenceTab>
          ariaLabel="偏好设置分类"
          className="preferences-tabs__control"
          mode="tabs"
          onChange={setActiveTab}
          options={[
            { label: '通用偏好', value: 'general' },
            { label: 'Nextdoc4j', value: 'nextdoc4j' },
          ]}
          value={activeTab}
        />
      </div>

      <ContentTransition
        transitionKey={activeTab}
        className="preferences-drawer__content workspace-scrollbar"
      >
        {activeTab === 'general' ? (
          <>
            <PreferenceSection
              icon={<IconPalette aria-hidden="true" size={17} stroke={1.8} />}
              title="外观"
            >
              <div className="preferences-card">
                <PreferenceRow
                  control={
                    <SegmentedControl<ThemePreference>
                      ariaLabel="主题模式"
                      className="preferences-choice-control"
                      onChange={(theme) => updatePreferences({ theme })}
                      options={[
                        { label: '浅色', value: 'light' },
                        { label: '深色', value: 'dark' },
                        { label: '跟随系统', value: 'system' },
                      ]}
                      value={preferences.theme}
                    />
                  }
                  title="主题模式"
                />
                <PreferenceRow
                  control={
                    <SegmentedControl<ContentWidthPreference>
                      ariaLabel="内容宽度"
                      className="preferences-choice-control"
                      onChange={(contentWidth) => updatePreferences({ contentWidth })}
                      options={[
                        { label: '自适应', value: 'auto' },
                        { label: '标准', value: 'standard' },
                        { label: '宽屏', value: 'wide' },
                      ]}
                      value={preferences.contentWidth}
                    />
                  }
                  title="内容宽度"
                />
                <PreferenceRow
                  control={
                    <SwitchControl
                      checked={preferences.watermarkEnabled}
                      className="preferences-boolean-control"
                      label="显示水印"
                      onChange={(watermarkEnabled) => updatePreferences({ watermarkEnabled })}
                    />
                  }
                  title="显示水印"
                />
              </div>
            </PreferenceSection>

            <PreferenceSection
              icon={<IconFileText aria-hidden="true" size={17} stroke={1.8} />}
              title="文档展示"
            >
              <div className="preferences-card">
                <PreferenceRow
                  control={
                    <SwitchControl
                      checked={Boolean(brandFooterText && preferences.copyrightEnabled)}
                      className="preferences-boolean-control"
                      disabled={!brandFooterText}
                      label="显示版权"
                      onChange={(copyrightEnabled) => updatePreferences({ copyrightEnabled })}
                    />
                  }
                  title="显示版权"
                />
              </div>
              {brandFooterText && (
                <div className="preferences-copyright-preview">
                  <IconCopyright aria-hidden="true" size={13} stroke={1.8} />
                  <span>
                    <CopyrightText value={brandFooterText} />
                  </span>
                </div>
              )}
            </PreferenceSection>

            <PreferenceSection
              icon={<IconLayoutSidebar aria-hidden="true" size={17} stroke={1.8} />}
              title="工作区"
            >
              <div className="preferences-card">
                <PreferenceRow
                  control={
                    <SwitchControl
                      checked={preferences.middleClickCloseEnabled}
                      className="preferences-boolean-control"
                      label="鼠标中键关闭标签页"
                      onChange={(middleClickCloseEnabled) =>
                        updatePreferences({ middleClickCloseEnabled })
                      }
                    />
                  }
                  title="鼠标中键关闭标签页"
                />
                <PreferenceRow
                  control={
                    <SwitchControl
                      checked={preferences.restoreTabsEnabled}
                      className="preferences-boolean-control"
                      label="恢复上次标签页"
                      onChange={(restoreTabsEnabled) => updatePreferences({ restoreTabsEnabled })}
                    />
                  }
                  title="恢复上次标签页"
                />
                <PreferenceRow
                  control={
                    <SegmentedControl<NavigationExpansionPreference>
                      ariaLabel="菜单展开方式"
                      className="preferences-choice-control"
                      onChange={(navigationExpansion) => updatePreferences({ navigationExpansion })}
                      options={[
                        { label: '自由展开', value: 'free' },
                        { label: '单分组', value: 'accordion' },
                      ]}
                      value={preferences.navigationExpansion}
                    />
                  }
                  title="菜单展开方式"
                />
              </div>
            </PreferenceSection>
          </>
        ) : (
          <>
            <PreferenceSection
              icon={<IconServer aria-hidden="true" size={17} stroke={1.8} />}
              title="运行环境"
            >
              <div className="preferences-runtime-card">
                <div className="preferences-runtime-card__main">
                  <span>
                    <IconServer aria-hidden="true" size={17} stroke={1.8} />
                  </span>
                  <div>
                    <b>{isAggregation ? '网关聚合模式' : '单体应用模式'}</b>
                    <small className={unavailableServiceCount > 0 ? 'has-error' : ''}>
                      <i />
                      {unavailableServiceCount > 0
                        ? `${unavailableServiceCount} 个服务不可用`
                        : isAggregation
                          ? '运行正常'
                          : '当前文档运行正常'}
                    </small>
                  </div>
                  {isAggregation && (
                    <SelectMenu
                      ariaLabel="设置生效范围"
                      className="preferences-scope-select"
                      menuClassName="preferences-scope-menu"
                      disabled={clearingDrafts}
                      onChange={selectScope}
                      options={[
                        { label: '全部服务', value: '__all__' },
                        { label: `当前服务 · ${activeServiceName}`, value: '__current__' },
                      ]}
                      value={scopeValue}
                    />
                  )}
                </div>
                <div className="preferences-runtime-stats">
                  <span>
                    <b>
                      <AnimatedCounter value={isAggregation ? configurationServices.length : 1} />
                    </b>
                    {isAggregation ? '可用服务' : '当前文档'}
                  </span>
                  <span>
                    <b>
                      <AnimatedCounter value={operationGroupCount} />
                    </b>
                    接口分组
                  </span>
                  <span>
                    <b>
                      <AnimatedCounter value={draftCount} />
                    </b>
                    调试草稿
                  </span>
                </div>
              </div>
            </PreferenceSection>

            <PreferenceSection
              icon={<IconAdjustments aria-hidden="true" size={17} stroke={1.8} />}
              title="文档与调试"
            >
              <div className="preferences-card">
                <PreferenceRow
                  control={
                    <SwitchControl
                      checked={displayedGroupOverviewEnabled}
                      className="preferences-boolean-control"
                      label="接口分组概览"
                      onChange={(enabled) =>
                        allServicesScope
                          ? onAllGroupOverviewEnabledChange(enabled)
                          : onGroupOverviewEnabledChange(enabled)
                      }
                    />
                  }
                  title="接口分组概览"
                />
                <PreferenceRow
                  control={
                    <SwitchControl
                      checked={displayedDebugCacheEnabled}
                      className="preferences-boolean-control"
                      label="调试草稿缓存"
                      onChange={(enabled) =>
                        allServicesScope
                          ? onAllDebugCacheEnabledChange(enabled)
                          : onDebugCacheEnabledChange(enabled)
                      }
                    />
                  }
                  title="调试草稿缓存"
                />
              </div>
            </PreferenceSection>

            <PreferenceSection
              icon={<IconDatabase aria-hidden="true" size={17} stroke={1.8} />}
              title="缓存状态"
            >
              <div className="preferences-cache-card">
                <b>
                  {allServicesScope
                    ? `全部服务共有 ${draftCount} 个调试草稿`
                    : `${isAggregation ? activeServiceName : '当前文档'}共有 ${draftCount} 个调试草稿`}
                </b>
                <DeleteButton
                  label="清理草稿"
                  description={`${allServicesScope ? '全部服务' : activeServiceName}的 ${draftCount} 个调试草稿将被清理，无法撤销。`}
                  disabled={draftCount === 0}
                  onConfirm={clearCurrentDrafts}
                />
              </div>
            </PreferenceSection>
          </>
        )}
      </ContentTransition>
    </Modal>
  );
}
