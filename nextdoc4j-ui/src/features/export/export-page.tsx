import { HeightTransition } from '../../components/rare-ui/height-transition';
import { AnimatedCheckbox } from '../../components/rare-ui/animated-check';
import { AnimatedCounter } from '../../components/rare-ui/animated-counter';
import { SegmentedControl } from '../../components/segmented-control';
import { applicationLocalStorage } from '../workspace/storage/browser-storage';
import { useNotification } from '../../lib/notifications';
import { Input } from '../../components/input';
import { memo, useEffect, useMemo, useState } from 'react';

import { IconChevronRight, IconSearch } from '@tabler/icons-react';

import {
  allOperationsSourceId,
  getDocumentationOperationKey,
  type DocumentationSource,
} from '../documentation/workspace';
import type { ApiOperation, OpenApiDocument, ServiceDefinition } from '../../types/openapi';
import { mergeAggregationExportDocuments } from './aggregation';
import { createExportDocumentModel } from './document-model';
import { createExportFileName, createOpenApiSubset, type ExportSelection } from './openapi-subset';
import { createOpenApiHtml } from './html';
import { createOpenApiMarkdown } from './markdown';
import { getOperations } from '../openapi/utils';
import {
  readExportPreferences,
  writeExportPreferences,
  type AggregationExportScope,
  type ExportPreferences,
} from './preferences';
import type { AggregationExportDocument, AggregationExportResult } from './types';
import type { ExportOperationEntry } from './types';
import { VirtualMarkdownPreview } from './virtual-markdown-preview';
import { createOpenApiWordBlob } from './word';
import { downloadBlob, printHtml } from './browser-download';
import { ExportDialog, ExportIconButton } from './export-dialog';
import { exportFormatOptions, type ExportFormat } from './export-formats';

interface ExportPageProps {
  aggregationServices?: ServiceDefinition[];
  document: OpenApiDocument;
  documentDescription: string;
  documentTitle: string;
  onLoadAggregationDocuments?: (services: ServiceDefinition[]) => Promise<AggregationExportResult>;
  serviceDocumentUrl?: string;
  sources: DocumentationSource[];
}

type ExportScopeKind = ExportSelection['kind'];

const emptyAggregationServices: ServiceDefinition[] = [];

interface AggregationOperationEntry extends ExportOperationEntry {
  serviceName: string;
  serviceUrl: string;
}

/**
 * Creates a document-independent operation identity for service and group matching.
 *
 * @param operation OpenAPI operation containing an HTTP method and path.
 * @returns Stable method-and-path key within one service document.
 */
const getOperationContractKey = (operation: Pick<ApiOperation, 'method' | 'path'>) =>
  `${operation.method}:${operation.path}`;

/**
 * Reads a restorable export range while allowing browser privacy settings to deny storage.
 *
 * @param sources Available sources in the active service workspace.
 * @param serviceDocumentUrl Selected service OpenAPI URL, omitted for single-app mode.
 * @returns Persisted valid range, or the default all-operations range for the first source.
 */
const getInitialPreferences = (
  sources: DocumentationSource[],
  serviceDocumentUrl?: string,
): ExportPreferences => {
  const fallback: ExportPreferences = {
    aggregationOperationKeys: [],
    aggregationScope: 'all',
    selection: { kind: 'all' },
    serviceUrls: [],
    sourceId: sources[0]?.id || '',
  };
  try {
    return readExportPreferences(applicationLocalStorage, serviceDocumentUrl) ?? fallback;
  } catch {
    return fallback;
  }
};

/**
 * Selects a source-aware OpenAPI range and downloads its dependency-complete JSON subset.
 *
 * @param props Selected OpenAPI document, application metadata and aggregation loading callbacks.
 * @returns Export scope controls, virtual Markdown preview and format dialog.
 */
function ExportPageContent({
  aggregationServices = emptyAggregationServices,
  document,
  documentDescription,
  documentTitle,
  onLoadAggregationDocuments,
  serviceDocumentUrl,
  sources,
}: ExportPageProps) {
  const [initialPreferences] = useState(() => getInitialPreferences(sources, serviceDocumentUrl));
  const [range, setRange] = useState<Pick<ExportPreferences, 'selection' | 'sourceId'>>({
    selection: initialPreferences.selection,
    sourceId: initialPreferences.sourceId,
  });
  const setExportMessage = useNotification();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [operationQuery, setOperationQuery] = useState('');
  const [aggregationScope, setAggregationScope] = useState<AggregationExportScope>(
    initialPreferences.aggregationScope,
  );
  const [aggregationDocuments, setAggregationDocuments] = useState<AggregationExportDocument[]>([]);
  const [aggregationFailures, setAggregationFailures] = useState<string[]>([]);
  const [aggregationLoading, setAggregationLoading] = useState(aggregationServices.length > 0);
  const [expandedAggregationServiceUrls, setExpandedAggregationServiceUrls] = useState<string[]>(
    [],
  );
  const [selectedAggregationOperationKeys, setSelectedAggregationOperationKeys] = useState(
    initialPreferences.aggregationOperationKeys,
  );
  const [selectedAggregationServiceUrls, setSelectedAggregationServiceUrls] = useState(() =>
    initialPreferences.serviceUrls.length > 0
      ? initialPreferences.serviceUrls
      : aggregationServices.filter((service) => !service.disabled).map((service) => service.url),
  );
  const isAggregationWorkspace = aggregationServices.length > 0;
  const availableAggregationServices = useMemo(
    () => aggregationServices.filter((service) => !service.disabled),
    [aggregationServices],
  );
  const mainSource = useMemo(
    () => sources.find((item) => item.id === allOperationsSourceId) ?? sources[0],
    [sources],
  );
  const source = mainSource;
  const swaggerConfigGroups = useMemo(
    () => (isAggregationWorkspace ? [] : sources.filter((item) => item.id !== mainSource?.id)),
    [isAggregationWorkspace, mainSource?.id, sources],
  );
  const singleAvailableOperations = useMemo(() => getOperations(document), [document]);
  const scopeOptions: Array<[ExportScopeKind, string]> = [
    ['all', '全部接口'],
    ['groups', '按分组'],
    ['operations', '按接口'],
  ];
  const scopeKind = range.selection.kind;
  const selectedGroupSourceIds = range.selection.kind === 'groups' ? range.selection.sourceIds : [];
  const selectedOperationKeys =
    range.selection.kind === 'operations' ? range.selection.operationKeys : [];

  useEffect(() => {
    setRange((current) => {
      if (!isAggregationWorkspace && current.selection.kind === 'tags') {
        return { ...current, selection: { kind: 'all' } };
      }
      return current;
    });
  }, [isAggregationWorkspace]);

  useEffect(() => {
    if (!sources.some((item) => item.id === range.sourceId)) {
      setRange({ selection: { kind: 'all' }, sourceId: sources[0]?.id || '' });
    }
  }, [range.sourceId, sources]);

  useEffect(() => {
    if (!source) return;
    const availableTags = new Set(source.groups.map(([tag]) => tag));
    const availableOperationKeys = new Set(
      singleAvailableOperations.map(getDocumentationOperationKey),
    );
    const availableGroupSourceIds = new Set(swaggerConfigGroups.map((group) => group.id));
    setRange((current) => {
      if (current.selection.kind === 'tags') {
        const tags = current.selection.tags.filter((tag) => availableTags.has(tag));
        if (tags.length !== current.selection.tags.length) {
          return {
            ...current,
            selection: tags.length > 0 ? { kind: 'tags', tags } : { kind: 'all' },
          };
        }
      }
      if (current.selection.kind === 'operations') {
        const operationKeys = current.selection.operationKeys.filter((key) =>
          availableOperationKeys.has(key),
        );
        if (operationKeys.length !== current.selection.operationKeys.length) {
          return {
            ...current,
            selection:
              operationKeys.length > 0 ? { kind: 'operations', operationKeys } : { kind: 'all' },
          };
        }
      }
      if (current.selection.kind === 'groups') {
        const sourceIds = current.selection.sourceIds.filter((id) =>
          availableGroupSourceIds.has(id),
        );
        if (sourceIds.length !== current.selection.sourceIds.length) {
          return {
            ...current,
            selection: sourceIds.length > 0 ? { kind: 'groups', sourceIds } : { kind: 'all' },
          };
        }
      }
      return current;
    });
  }, [singleAvailableOperations, source, swaggerConfigGroups]);

  useEffect(() => {
    const availableUrls = new Set(availableAggregationServices.map((service) => service.url));
    setSelectedAggregationServiceUrls((current) => {
      const next = current.filter((url) => availableUrls.has(url));
      if (next.length > 0) return next.length === current.length ? current : next;
      return availableAggregationServices.map((service) => service.url);
    });
  }, [availableAggregationServices]);

  useEffect(() => {
    if (!isAggregationWorkspace || !onLoadAggregationDocuments) return;
    let disposed = false;
    setAggregationLoading(true);
    void onLoadAggregationDocuments(availableAggregationServices)
      .then((result) => {
        if (disposed) return;
        setAggregationDocuments(result.documents);
        setAggregationFailures(result.failures);
      })
      .catch(() => {
        if (!disposed) setAggregationFailures(['聚合服务文档加载失败，请重试。']);
      })
      .finally(() => {
        if (!disposed) setAggregationLoading(false);
      });
    return () => {
      disposed = true;
    };
  }, [availableAggregationServices, isAggregationWorkspace, onLoadAggregationDocuments]);

  const aggregationOperationEntries = useMemo<AggregationOperationEntry[]>(
    () =>
      aggregationDocuments.flatMap(({ document, groups, serviceName, serviceUrl }) => {
        const groupByOperation = new Map<string, string>();
        groups.forEach((group) => {
          group.operationKeys.forEach((key) => groupByOperation.set(key, group.name));
        });
        return getOperations(document).map((operation) => ({
          groupName:
            groupByOperation.get(getOperationContractKey(operation)) ||
            operation.group ||
            '默认分组',
          key: `${serviceUrl}:${getOperationContractKey(operation)}`,
          operation,
          serviceName,
          serviceUrl,
        }));
      }),
    [aggregationDocuments],
  );

  const aggregationEntriesByService = useMemo(
    () =>
      aggregationDocuments.map((document) => ({
        entries: aggregationOperationEntries.filter(
          (entry) => entry.serviceUrl === document.serviceUrl,
        ),
        serviceName: document.serviceName,
        serviceUrl: document.serviceUrl,
      })),
    [aggregationDocuments, aggregationOperationEntries],
  );

  useEffect(() => {
    if (aggregationLoading || (isAggregationWorkspace && aggregationDocuments.length === 0)) return;
    const operationKeys = aggregationOperationEntries.map((entry) => entry.key);
    setSelectedAggregationOperationKeys((current) => {
      const next = current.filter((key) => operationKeys.includes(key));
      return next.length > 0 ? next : operationKeys;
    });
    setExpandedAggregationServiceUrls((current) =>
      current.length > 0 || aggregationEntriesByService.length === 0
        ? current
        : [aggregationEntriesByService[0]!.serviceUrl],
    );
  }, [
    aggregationDocuments.length,
    aggregationEntriesByService,
    aggregationLoading,
    aggregationOperationEntries,
    isAggregationWorkspace,
  ]);

  useEffect(() => {
    try {
      writeExportPreferences(applicationLocalStorage, serviceDocumentUrl, {
        aggregationOperationKeys: selectedAggregationOperationKeys,
        aggregationScope,
        selection: range.selection,
        serviceUrls: selectedAggregationServiceUrls,
        sourceId: range.sourceId,
      });
    } catch {
      // Persisting a convenience selection must not block document export.
    }
  }, [
    aggregationScope,
    range,
    selectedAggregationOperationKeys,
    selectedAggregationServiceUrls,
    serviceDocumentUrl,
  ]);

  const selectedAggregationEntries = useMemo(() => {
    if (aggregationScope === 'all') return aggregationOperationEntries;
    if (aggregationScope === 'services') {
      return aggregationOperationEntries.filter((entry) =>
        selectedAggregationServiceUrls.includes(entry.serviceUrl),
      );
    }
    return aggregationOperationEntries.filter((entry) =>
      selectedAggregationOperationKeys.includes(entry.key),
    );
  }, [
    aggregationOperationEntries,
    aggregationScope,
    selectedAggregationOperationKeys,
    selectedAggregationServiceUrls,
  ]);

  const aggregationSubset = useMemo(() => {
    const documents = aggregationDocuments.flatMap((document) => {
      const operations = selectedAggregationEntries
        .filter((entry) => entry.serviceUrl === document.serviceUrl)
        .map((entry) => entry.operation);
      return operations.length
        ? [{ ...document, document: createOpenApiSubset(document.document, operations) }]
        : [];
    });
    return mergeAggregationExportDocuments(documents);
  }, [aggregationDocuments, selectedAggregationEntries]);

  const singleOperations = useMemo(() => {
    if (range.selection.kind === 'groups') {
      const sourceIds = range.selection.sourceIds;
      const selectedSources = swaggerConfigGroups.filter((group) => sourceIds.includes(group.id));
      return [
        ...new Map(
          selectedSources
            .flatMap((group) => group.operations)
            .map((operation) => [getOperationContractKey(operation), operation]),
        ).values(),
      ];
    }
    if (range.selection.kind === 'operations') {
      const selectedKeys = new Set(range.selection.operationKeys);
      return singleAvailableOperations.filter((operation) =>
        selectedKeys.has(getDocumentationOperationKey(operation)),
      );
    }
    return singleAvailableOperations;
  }, [range.selection, singleAvailableOperations, swaggerConfigGroups]);
  const singleSubset = useMemo(
    () => createOpenApiSubset(document, singleOperations),
    [document, singleOperations],
  );
  const operations = isAggregationWorkspace
    ? selectedAggregationEntries.map((entry) => entry.operation)
    : singleOperations;
  const subset = isAggregationWorkspace ? aggregationSubset : singleSubset;
  const singleOperationEntries = useMemo<ExportOperationEntry[]>(
    () =>
      singleOperations.map((operation) => {
        const operationKey = getOperationContractKey(operation);
        const matchedGroup = swaggerConfigGroups.find((group) =>
          group.operations.some((item) => getOperationContractKey(item) === operationKey),
        );
        return {
          groupName: matchedGroup?.name || operation.group || '默认分组',
          key: operationKey,
          operation,
        };
      }),
    [singleOperations, swaggerConfigGroups],
  );
  const exportEntries = isAggregationWorkspace
    ? selectedAggregationEntries
    : singleOperationEntries;
  const exportModel = useMemo(
    () =>
      subset
        ? createExportDocumentModel(subset, exportEntries, documentTitle, documentDescription)
        : undefined,
    [documentDescription, documentTitle, exportEntries, subset],
  );
  const exportDocumentSubset = exportModel?.document;
  const canExport = Boolean(exportModel && operations.length > 0);
  const fileTitle = exportModel?.title || '';
  const markdownPreview = useMemo(
    () => (exportModel ? createOpenApiMarkdown(exportModel) : ''),
    [exportModel],
  );
  const exportSourceName = isAggregationWorkspace ? 'aggregation' : source?.name || '';
  const filteredOperations = singleAvailableOperations.filter((operation) => {
    const query = operationQuery.trim().toLocaleLowerCase();
    if (!query) return true;
    return `${operation.method} ${operation.path} ${operation.summary ?? ''}`
      .toLocaleLowerCase()
      .includes(query);
  });

  const resetScope = (kind: ExportScopeKind) => {
    setRange((current) => ({
      ...current,
      selection:
        kind === 'tags'
          ? { kind, tags: [] }
          : kind === 'groups'
            ? { kind, sourceIds: [] }
            : kind === 'operations'
              ? { kind, operationKeys: [] }
              : { kind },
    }));
  };
  const toggleOperation = (operationKey: string) =>
    setRange((current) => {
      const operationKeys =
        current.selection.kind === 'operations' ? current.selection.operationKeys : [];
      return {
        ...current,
        selection: {
          kind: 'operations',
          operationKeys: operationKeys.includes(operationKey)
            ? operationKeys.filter((item) => item !== operationKey)
            : [...operationKeys, operationKey],
        },
      };
    });

  /**
   * Toggles one Swagger Config document group in the single-service export selection.
   *
   * @param sourceId Stable documentation-source identifier for the selected Swagger Config group.
   * @returns Nothing; updates the group-based export selection.
   */
  const toggleSwaggerConfigGroup = (sourceId: string) =>
    setRange((current) => {
      const sourceIds = current.selection.kind === 'groups' ? current.selection.sourceIds : [];
      return {
        ...current,
        selection: {
          kind: 'groups',
          sourceIds: sourceIds.includes(sourceId)
            ? sourceIds.filter((id) => id !== sourceId)
            : [...sourceIds, sourceId],
        },
      };
    });

  /**
   * Selects or clears every Swagger Config group available to the current single-service workspace.
   *
   * @returns Nothing; replaces the group-based export selection with the complete or empty group set.
   */
  const toggleAllSwaggerConfigGroups = () => {
    const sourceIds = swaggerConfigGroups.map((group) => group.id);
    setRange((current) => {
      const selectedIds = current.selection.kind === 'groups' ? current.selection.sourceIds : [];
      return {
        ...current,
        selection:
          sourceIds.length > 0 && sourceIds.every((id) => selectedIds.includes(id))
            ? { kind: 'groups', sourceIds: [] }
            : { kind: 'groups', sourceIds },
      };
    });
  };

  /**
   * Switches the active aggregation export range and restores all services for the all-services mode.
   *
   * @param scope Requested aggregation export range.
   * @returns Nothing; updates the active range and the corresponding service selection.
   */
  const selectAggregationScope = (scope: AggregationExportScope) => {
    setAggregationScope(scope);
    if (scope === 'all') {
      setSelectedAggregationServiceUrls(availableAggregationServices.map((service) => service.url));
    }
  };

  /**
   * Toggles one aggregation service in the service-level export range.
   *
   * @param serviceUrl Selected aggregation service document URL.
   * @returns Nothing; adds or removes the service from the combined export range.
   */
  const toggleAggregationService = (serviceUrl: string) =>
    setSelectedAggregationServiceUrls((current) =>
      current.includes(serviceUrl)
        ? current.filter((url) => url !== serviceUrl)
        : [...current, serviceUrl],
    );

  /**
   * Expands or collapses one service in the cross-service fine-selection tree.
   *
   * @param serviceUrl Aggregation service document URL that owns the tree branch.
   * @returns Nothing; changes only the visual expansion state for that branch.
   */
  const toggleAggregationServiceExpansion = (serviceUrl: string) =>
    setExpandedAggregationServiceUrls((current) =>
      current.includes(serviceUrl)
        ? current.filter((url) => url !== serviceUrl)
        : [...current, serviceUrl],
    );

  /**
   * Toggles one operation in the cross-service fine-selection range.
   *
   * @param operationKey Service-qualified HTTP method and path identifier.
   * @returns Nothing; adds or removes the operation from the combined export range.
   */
  const toggleAggregationOperation = (operationKey: string) =>
    setSelectedAggregationOperationKeys((current) =>
      current.includes(operationKey)
        ? current.filter((key) => key !== operationKey)
        : [...current, operationKey],
    );

  /**
   * Selects or clears every operation owned by one aggregation service.
   *
   * @param operationKeys Service-qualified operation identifiers in the visible tree branch.
   * @returns Nothing; replaces this service branch's operation selection while preserving other services.
   */
  const toggleAggregationServiceOperations = (operationKeys: string[]) =>
    setSelectedAggregationOperationKeys((current) => {
      const allSelected =
        operationKeys.length > 0 && operationKeys.every((key) => current.includes(key));
      return allSelected
        ? current.filter((key) => !operationKeys.includes(key))
        : [...new Set([...current, ...operationKeys])];
    });

  /**
   * Selects or clears every currently filtered operation from the active documentation source.
   *
   * @returns Nothing; replaces the operation-based export selection with the complete or empty result set.
   */
  const toggleAllOperations = () => {
    const operationKeys = filteredOperations.map(getDocumentationOperationKey);
    setRange((current) => {
      const selectedKeys =
        current.selection.kind === 'operations' ? current.selection.operationKeys : [];
      return {
        ...current,
        selection: operationKeys.every((key) => selectedKeys.includes(key))
          ? { kind: 'operations', operationKeys: [] }
          : { kind: 'operations', operationKeys },
      };
    });
  };

  /**
   * Creates the selected document format from the current dependency-complete OpenAPI subset.
   *
   * @param format Export format selected in the shared document dialog.
   * @returns Nothing; downloads a file or opens the browser print flow and reports the resulting status.
   */
  const exportDocument = async (format: ExportFormat) => {
    if (!exportModel || !exportDocumentSubset) return;
    try {
      if (format === 'json') {
        downloadBlob(
          new Blob([JSON.stringify(exportDocumentSubset, null, 2)], {
            type: 'application/json;charset=utf-8',
          }),
          createExportFileName(fileTitle, exportSourceName, 'json'),
        );
        setExportMessage('已下载 OpenAPI JSON。');
      } else if (format === 'markdown') {
        downloadBlob(
          new Blob([markdownPreview], { type: 'text/markdown;charset=utf-8' }),
          createExportFileName(fileTitle, exportSourceName, 'md'),
        );
        setExportMessage('已下载 Markdown 文档。');
      } else if (format === 'html') {
        downloadBlob(
          new Blob([createOpenApiHtml(exportModel)], { type: 'text/html;charset=utf-8' }),
          createExportFileName(fileTitle, exportSourceName, 'html'),
        );
        setExportMessage('已下载独立 HTML 文档。');
      } else if (format === 'pdf') {
        setExportMessage(
          printHtml(createOpenApiHtml(exportModel))
            ? '已打开打印窗口，请在系统打印面板中另存为 PDF。'
            : '浏览器拦截了打印窗口，请允许弹窗后重试。',
        );
      } else {
        setExportMessage('正在生成 Word 文档…');
        downloadBlob(
          await createOpenApiWordBlob(markdownPreview, exportModel.title),
          createExportFileName(fileTitle, exportSourceName, 'docx'),
        );
        setExportMessage('已下载 Word 文档。');
      }
    } catch (error) {
      const selectedFormat = exportFormatOptions.find((item) => item.id === format);
      setExportMessage(`${selectedFormat?.label || '文档'}生成失败，请重试。`);
      throw error;
    }
  };

  if (!source) {
    return (
      <div className="export-workspace export-workspace--empty">
        <section className="export-empty-state">
          <h1>没有可导出的接口</h1>
          <p>当前文档尚未加载任何 OpenAPI 来源。</p>
        </section>
      </div>
    );
  }

  return (
    <>
      <div className={`export-workspace ${isAggregationWorkspace ? '' : 'is-single-service'}`}>
        <section className="export-scope-card">
          <header className="scope-card-header">
            <h1 className="scope-card-title">
              导出范围
              {isAggregationWorkspace && <span className="scope-card-badge">聚合服务</span>}
            </h1>
          </header>

          <div className="scope-scroll-area">
            {isAggregationWorkspace && (
              <>
                <div className="scope-range-control">
                  <div className="scope-section-label">微服务导出模式</div>
                  <SegmentedControl<AggregationExportScope>
                    ariaLabel="微服务导出模式"
                    mode="tabs"
                    value={aggregationScope}
                    onChange={selectAggregationScope}
                    options={[
                      { value: 'all', label: '全部微服务' },
                      { value: 'services', label: '按微服务选择' },
                      { value: 'fine', label: '跨服务细选' },
                    ]}
                  />
                </div>

                {aggregationLoading && (
                  <p className="scope-selection-note">正在加载微服务接口文档…</p>
                )}

                {!aggregationLoading && aggregationScope === 'all' && (
                  <p className="scope-selection-note scope-selection-panel">
                    已选中当前网关集群下<strong>全部微服务的全部接口</strong>
                    ，将合并生成一份接口规范文档。
                  </p>
                )}

                {!aggregationLoading && aggregationScope === 'services' && (
                  <div className="scope-selection-list scope-selection-panel">
                    <div className="scope-section-label">
                      <span>微服务清单</span>
                      <button
                        onClick={() =>
                          setSelectedAggregationServiceUrls((current) =>
                            current.length === availableAggregationServices.length
                              ? []
                              : availableAggregationServices.map((service) => service.url),
                          )
                        }
                        type="button"
                      >
                        {selectedAggregationServiceUrls.length ===
                        availableAggregationServices.length
                          ? '取消全选'
                          : '全选'}
                      </button>
                    </div>
                    <div className="scope-items-container">
                      <div className="scope-groups-list">
                        {availableAggregationServices.map((service) => {
                          const operationCount = aggregationEntriesByService.find(
                            (entry) => entry.serviceUrl === service.url,
                          )?.entries.length;
                          return (
                            <label className="scope-item-row" key={service.url}>
                              <span className="scope-item-left">
                                <AnimatedCheckbox
                                  checked={selectedAggregationServiceUrls.includes(service.url)}
                                  className="scope-checkbox"
                                  onChange={() => toggleAggregationService(service.url)}
                                />
                                <span className="scope-item-label">{service.name}</span>
                              </span>
                              <span className="scope-item-badge">
                                {operationCount === undefined
                                  ? '加载中'
                                  : `${operationCount} 个接口`}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {!aggregationLoading && aggregationScope === 'fine' && (
                  <div className="scope-selection-list scope-selection-panel">
                    <div className="scope-section-label">
                      <span>跨微服务接口树</span>
                      <span>可按服务或接口勾选</span>
                    </div>
                    <div className="aggregation-service-tree">
                      {aggregationEntriesByService.map((service) => {
                        const operationKeys = service.entries.map((entry) => entry.key);
                        const selectedCount = operationKeys.filter((key) =>
                          selectedAggregationOperationKeys.includes(key),
                        ).length;
                        const expanded = expandedAggregationServiceUrls.includes(
                          service.serviceUrl,
                        );
                        return (
                          <section
                            className={`aggregation-service-tree__group ${expanded ? 'is-expanded' : ''}`}
                            key={service.serviceUrl}
                          >
                            <header>
                              <button
                                aria-expanded={expanded}
                                onClick={() =>
                                  toggleAggregationServiceExpansion(service.serviceUrl)
                                }
                                type="button"
                              >
                                <IconChevronRight aria-hidden="true" size={14} stroke={1.8} />
                                <span>{service.serviceName}</span>
                              </button>
                              <label>
                                <AnimatedCheckbox
                                  checked={
                                    operationKeys.length > 0 &&
                                    selectedCount === operationKeys.length
                                  }
                                  className="scope-checkbox"
                                  onChange={() => toggleAggregationServiceOperations(operationKeys)}
                                />
                                <span className="scope-item-badge">
                                  <AnimatedCounter value={selectedCount} /> / {operationKeys.length}
                                </span>
                              </label>
                            </header>
                            <HeightTransition
                              open={expanded}
                              contentClassName="aggregation-service-tree__operations"
                              unmountOnExit
                            >
                              {service.entries.map((entry) => (
                                <label className="scope-item-row" key={entry.key}>
                                  <span className="scope-item-left">
                                    <AnimatedCheckbox
                                      checked={selectedAggregationOperationKeys.includes(entry.key)}
                                      className="scope-checkbox"
                                      onChange={() => toggleAggregationOperation(entry.key)}
                                    />
                                    <span className={`scope-method is-${entry.operation.method}`}>
                                      {entry.operation.method}
                                    </span>
                                    <span className="scope-item-label">
                                      {entry.operation.summary || entry.operation.path}
                                    </span>
                                  </span>
                                  <code className="scope-operation-path">
                                    {entry.operation.path}
                                  </code>
                                </label>
                              ))}
                            </HeightTransition>
                          </section>
                        );
                      })}
                    </div>
                  </div>
                )}

                {aggregationFailures.length > 0 && (
                  <p className="scope-load-failures">{aggregationFailures.join('；')}</p>
                )}
              </>
            )}

            {!isAggregationWorkspace && (
              <div className="scope-range-control">
                <div className="scope-section-label">选择导出范围</div>
                <SegmentedControl
                  ariaLabel="选择导出范围"
                  mode="tabs"
                  value={scopeKind}
                  onChange={resetScope}
                  options={scopeOptions.map(([value, label]) => ({ value, label }))}
                />
              </div>
            )}

            {!isAggregationWorkspace && scopeKind === 'all' && (
              <p className="scope-selection-note scope-selection-panel" key="all">
                已选中全部接口，导出时将包含关联数据模型。
              </p>
            )}

            {!isAggregationWorkspace && scopeKind === 'groups' && (
              <div className="scope-selection-list scope-selection-panel" key="groups">
                <div className="scope-section-label scope-section-label--actions">
                  <button onClick={toggleAllSwaggerConfigGroups} type="button">
                    {swaggerConfigGroups.length > 0 &&
                    swaggerConfigGroups.every((group) => selectedGroupSourceIds.includes(group.id))
                      ? '取消全选'
                      : '全选'}
                  </button>
                </div>
                <div className="scope-items-container">
                  <div className="scope-groups-list">
                    {swaggerConfigGroups.map((group) => (
                      <label className="scope-item-row" key={group.id}>
                        <span className="scope-item-left">
                          <AnimatedCheckbox
                            checked={selectedGroupSourceIds.includes(group.id)}
                            className="scope-checkbox"
                            onChange={() => toggleSwaggerConfigGroup(group.id)}
                          />
                          <span className="scope-item-label">{group.name}</span>
                        </span>
                        <span className="scope-item-badge">{group.operations.length} 个接口</span>
                      </label>
                    ))}
                    {!swaggerConfigGroups.length && (
                      <p className="scope-empty-search">暂无可导出的接口分组。</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!isAggregationWorkspace && scopeKind === 'operations' && (
              <div className="scope-selection-list scope-selection-panel" key="operations">
                <div className="scope-section-label">
                  <span>接口列表</span>
                  <button onClick={toggleAllOperations} type="button">
                    {filteredOperations.length > 0 &&
                    filteredOperations.every((operation) =>
                      selectedOperationKeys.includes(getDocumentationOperationKey(operation)),
                    )
                      ? '取消全选'
                      : '全选'}
                  </button>
                </div>
                <div className="scope-items-container">
                  <label className="scope-search-box ui-input-shell">
                    <IconSearch aria-hidden="true" size={14} stroke={1.8} />
                    <Input
                      variant="embedded"
                      onChange={(event) => setOperationQuery(event.target.value)}
                      placeholder="输入路径或接口名称搜索…"
                      value={operationQuery}
                    />
                  </label>
                  <div className="scope-operations-list">
                    {filteredOperations.map((operation) => {
                      const key = getDocumentationOperationKey(operation);
                      return (
                        <label className="scope-item-row" key={key}>
                          <span className="scope-item-left">
                            <AnimatedCheckbox
                              checked={selectedOperationKeys.includes(key)}
                              className="scope-checkbox"
                              onChange={() => toggleOperation(key)}
                            />
                            <span className={`scope-method is-${operation.method}`}>
                              {operation.method}
                            </span>
                            <span className="scope-item-label">
                              {operation.summary || operation.path}
                            </span>
                          </span>
                          <code className="scope-operation-path">{operation.path}</code>
                        </label>
                      );
                    })}
                    {!filteredOperations.length && (
                      <p className="scope-empty-search">未找到匹配接口。</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="export-preview-card">
          <header className="preview-card-topbar">
            <div className="preview-topbar-left">
              <h2 className="preview-card-heading">导出前预览</h2>
              <span className="preview-stats-tag">
                已选 <AnimatedCounter value={operations.length} /> 个接口
              </span>
            </div>
            <ExportIconButton disabled={!canExport} onClick={() => setExportDialogOpen(true)} />
          </header>
          {markdownPreview ? (
            <VirtualMarkdownPreview content={markdownPreview} />
          ) : (
            <p className="preview-empty-note">请选择至少一个接口后预览。</p>
          )}
        </section>
      </div>

      <ExportDialog
        onClose={() => setExportDialogOpen(false)}
        onExport={exportDocument}
        open={exportDialogOpen}
        summary={
          <>
            当前已选择{' '}
            <strong>
              <AnimatedCounter value={operations.length} />
            </strong>{' '}
            个接口
          </>
        }
      />
    </>
  );
}

export const ExportPage = memo(ExportPageContent);
