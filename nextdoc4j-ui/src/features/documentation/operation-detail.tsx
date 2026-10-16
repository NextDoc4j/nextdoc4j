import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { SegmentedControl } from '../../components/segmented-control';
import { OperationHeroCard } from './operation-hero-card';
import { RequestParameters } from './request-parameters';
import { ResponseParameters } from './response-parameters';
import { JsonExampleCard } from './json-example-card';
import { resolveResponseReference } from './response-schema';
import { getDefaultContentType } from '../openapi/utils';
import type { ApiOperation, OpenApiDocument } from '../../types/openapi';
import {
  createOperationDetailStateKey,
  readPersistentDetailState,
  writePersistentDetailState,
  type OperationDetailSelectionState,
} from './detail-state';

interface OperationDetailProps {
  document: OpenApiDocument;
  onOpenPlayground: (variants: Map<string, number>) => void;
  operation: ApiOperation;
  requestPrefix: string;
  storageScope: string;
  storageReady: boolean;
  storageDocumentUrl: string;
}

/**
 * Renders the legacy operation detail surface with schema cards and sticky examples.
 *
 * @param props Selected operation, active OpenAPI document and online-debug callback.
 * @returns A detailed endpoint document without changing existing routing or debug behavior.
 */
export const OperationDetail = memo(function OperationDetail({
  document,
  onOpenPlayground,
  operation,
  requestPrefix,
  storageScope,
  storageReady,
  storageDocumentUrl,
}: OperationDetailProps) {
  const schemas = useMemo(() => document.components?.schemas ?? {}, [document.components?.schemas]);
  const exampleRailRef = useRef<HTMLDivElement>(null);
  const requestContent = operation.requestBody?.content;
  const responseEntries = useMemo(
    () =>
      Object.entries(operation.responses ?? {}).map(
        ([code, response]) =>
          [code, resolveResponseReference(response, document.components)] as const,
      ),
    [operation.responses, document.components],
  );
  const detailStateKey = useMemo(
    () =>
      createOperationDetailStateKey(
        { ...operation, sourceGroupId: storageDocumentUrl },
        storageScope,
      ),
    [operation, storageDocumentUrl, storageScope],
  );
  const detailStateIdentity = useMemo(
    () =>
      `${detailStateKey}:${Object.keys(requestContent ?? {}).join(',')}:${responseEntries
        .map(([code]) => code)
        .join(',')}`,
    [detailStateKey, requestContent, responseEntries],
  );
  const [initialDetailState] = useState<OperationDetailSelectionState | undefined>(() =>
    readPersistentDetailState(detailStateKey),
  );
  const initialResponseCode =
    initialDetailState?.activeResponseCode &&
    responseEntries.some(([code]) => code === initialDetailState.activeResponseCode)
      ? initialDetailState.activeResponseCode
      : (responseEntries[0]?.[0] ?? '');
  const initialResponse = responseEntries.find(([code]) => code === initialResponseCode)?.[1];
  const [activeRequestContentType, setActiveRequestContentType] = useState(() =>
    initialDetailState?.activeRequestContentType &&
    Object.hasOwn(requestContent ?? {}, initialDetailState.activeRequestContentType)
      ? initialDetailState.activeRequestContentType
      : getDefaultContentType(requestContent),
  );
  const [activeResponseCode, setActiveResponseCode] = useState(initialResponseCode);
  const [activeResponseContentType, setActiveResponseContentType] = useState(() =>
    initialDetailState?.activeResponseContentType &&
    Object.hasOwn(initialResponse?.content ?? {}, initialDetailState.activeResponseContentType)
      ? initialDetailState.activeResponseContentType
      : getDefaultContentType(initialResponse?.content),
  );
  const [activeRequestExampleKey, setActiveRequestExampleKey] = useState(
    initialDetailState?.activeRequestExampleKey ?? '',
  );
  const [activeResponseExampleKey, setActiveResponseExampleKey] = useState(
    initialDetailState?.activeResponseExampleKey ?? '',
  );
  const [requestVariants, setRequestVariants] = useState(
    () => initialDetailState?.requestVariants ?? new Map<string, number>(),
  );
  const [responseVariants, setResponseVariants] = useState(
    () => initialDetailState?.responseVariants ?? new Map<string, number>(),
  );
  const [restoredDetailStateIdentity, setRestoredDetailStateIdentity] = useState('');
  const pendingSelectionsRef = useRef({ identity: '', request: false, response: false });
  const persistedDetailIdentityRef = useRef('');

  /** Marks selections made before persistent options finish loading.
   * @param side Request or response options changed by the user.
   * @returns Nothing; protects that option group from a late restoration result.
   */
  const markPendingSelection = (side: 'request' | 'response') => {
    if (storageReady) return;
    if (pendingSelectionsRef.current.identity !== detailStateIdentity) {
      pendingSelectionsRef.current = {
        identity: detailStateIdentity,
        request: false,
        response: false,
      };
    }
    pendingSelectionsRef.current[side] = true;
  };

  const activeResponse =
    responseEntries.find(([code]) => code === activeResponseCode) ?? responseEntries[0];
  const responseCode = activeResponse?.[0] ?? '';
  const response = activeResponse?.[1];
  const responseContentType =
    response?.content && Object.hasOwn(response.content, activeResponseContentType)
      ? activeResponseContentType
      : getDefaultContentType(response?.content);
  useEffect(() => {
    if (!storageReady) return;
    const stored = readPersistentDetailState(detailStateKey);
    const nextResponseCode =
      stored?.activeResponseCode &&
      responseEntries.some(([code]) => code === stored.activeResponseCode)
        ? stored.activeResponseCode
        : (responseEntries[0]?.[0] ?? '');
    const nextResponse = responseEntries.find(([code]) => code === nextResponseCode)?.[1];
    const pending =
      pendingSelectionsRef.current.identity === detailStateIdentity
        ? pendingSelectionsRef.current
        : undefined;
    if (!pending?.request) {
      setActiveRequestContentType(
        stored?.activeRequestContentType &&
          Object.hasOwn(requestContent ?? {}, stored.activeRequestContentType)
          ? stored.activeRequestContentType
          : getDefaultContentType(requestContent),
      );
      setActiveRequestExampleKey(stored?.activeRequestExampleKey ?? '');
      setRequestVariants(stored?.requestVariants ?? new Map());
    }
    if (!pending?.response) {
      setActiveResponseCode(nextResponseCode);
      setActiveResponseContentType(
        stored?.activeResponseContentType &&
          Object.hasOwn(nextResponse?.content ?? {}, stored.activeResponseContentType)
          ? stored.activeResponseContentType
          : getDefaultContentType(nextResponse?.content),
      );
      setActiveResponseExampleKey(stored?.activeResponseExampleKey ?? '');
      setResponseVariants(stored?.responseVariants ?? new Map());
    }
    if (pending?.request || pending?.response)
      persistedDetailIdentityRef.current = detailStateIdentity;
    setRestoredDetailStateIdentity(detailStateIdentity);
  }, [detailStateIdentity, detailStateKey, requestContent, responseEntries, storageReady]);

  useEffect(() => {
    if (!storageReady || restoredDetailStateIdentity !== detailStateIdentity) return;
    if (persistedDetailIdentityRef.current !== detailStateIdentity) {
      persistedDetailIdentityRef.current = detailStateIdentity;
      return;
    }
    try {
      writePersistentDetailState(detailStateKey, {
        activeRequestContentType,
        activeRequestExampleKey,
        activeResponseCode,
        activeResponseContentType,
        activeResponseExampleKey,
        requestVariants,
        responseVariants,
      });
    } catch {
      // Detail selections remain available for the current page when storage is unavailable.
    }
  }, [
    activeRequestContentType,
    activeRequestExampleKey,
    activeResponseCode,
    activeResponseContentType,
    activeResponseExampleKey,
    detailStateIdentity,
    detailStateKey,
    requestVariants,
    responseVariants,
    restoredDetailStateIdentity,
    storageReady,
  ]);

  useLayoutEffect(() => {
    const rail = exampleRailRef.current;
    const aside = rail?.closest<HTMLElement>('.legacy-operation__aside');
    const layout = rail?.closest<HTMLElement>('.legacy-operation__layout');
    if (!rail || !aside || !layout) return;
    const scrollport = rail.closest<HTMLElement>('.workspace-content-main');
    let frame: number | undefined;
    const observed = new Set<Element>();

    /**
     * Measures natural JSON content and allocates only the height needed by the active cards.
     * @param None; reads the rail and its current card elements.
     * @returns Nothing; uses a bounded split only when the cards cannot fit naturally.
     */
    const distributeHeight = () => {
      frame = undefined;
      const asideStyle = getComputedStyle(aside);
      const cards = Array.from(rail.children).filter(
        (child): child is HTMLElement =>
          child instanceof HTMLElement && child.classList.contains('operation-json__card'),
      );

      if (asideStyle.position === 'static') {
        if (aside.style.getPropertyValue('--operation-json__rail-height')) {
          aside.style.removeProperty('--operation-json__rail-height');
        }
        cards.forEach((card) => {
          if (card.style.flex) card.style.flex = '';
        });
        return;
      }

      const layoutStyle = getComputedStyle(layout);
      const top = parseFloat(asideStyle.top) || 0;
      const availableHeight = Math.max(
        0,
        (scrollport?.clientHeight ?? window.innerHeight) -
          top -
          (parseFloat(layoutStyle.paddingBottom) || 0),
      );
      const targets = new Set<Element>([rail]);
      if (scrollport) {
        targets.add(scrollport);
      }
      const sizes = cards.map((card) => {
        const content = card.querySelector<HTMLElement>('.operation-json__body-content');
        if (content) targets.add(content);
        const style = getComputedStyle(card);
        let chrome =
          (parseFloat(style.paddingTop) || 0) +
          (parseFloat(style.paddingBottom) || 0) +
          (parseFloat(style.borderTopWidth) || 0) +
          (parseFloat(style.borderBottomWidth) || 0);
        Array.from(card.children).forEach((child) => {
          if (child.classList.contains('operation-json__body')) return;
          targets.add(child);
          chrome += child.getBoundingClientRect().height;
        });
        const naturalContent = Math.max(
          1,
          content?.scrollHeight ?? 0,
          content?.getBoundingClientRect().height ?? 0,
        );
        return { chrome, content: naturalContent, natural: chrome + naturalContent };
      });
      observed.forEach((target) => {
        if (!targets.has(target)) {
          resizeObserver.unobserve(target);
          observed.delete(target);
        }
      });
      targets.forEach((target) => {
        if (!observed.has(target)) {
          observed.add(target);
          resizeObserver.observe(target);
        }
      });
      if (!cards.length) {
        aside.style.setProperty('--operation-json__rail-height', '0px');
        return;
      }
      const style = getComputedStyle(rail);
      const railPadding =
        (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
      const gap = (parseFloat(style.rowGap) || 0) * (cards.length - 1);
      const available = Math.max(0, availableHeight - railPadding - gap);
      const naturalHeight =
        sizes.reduce((total, size) => total + size.natural, 0) + railPadding + gap;
      const overflowing = naturalHeight > availableHeight;
      const heights = overflowing
        ? cards.map(() => available / cards.length)
        : sizes.map((size) => size.natural);
      if (overflowing && cards.length === 2) {
        const [request, response] = sizes;
        const bothLong = request.natural > available / 2 && response.natural > available / 2;
        if (bothLong) {
          heights[0] = available / 2;
          heights[1] = available / 2;
        } else {
          const similar =
            Math.abs(request.content - response.content) <=
            Math.max(request.content, response.content) * 0.1;
          const share = similar ? 0.5 : request.content / (request.content + response.content);
          const contentSpace = Math.max(0, available - request.chrome - response.chrome);
          const requestedHeight = similar ? available / 2 : request.chrome + contentSpace * share;
          const requestMinimum = Math.min(available / 2, request.chrome + 64);
          const responseMinimum = Math.min(available / 2, response.chrome + 64);
          heights[0] = Math.max(
            requestMinimum,
            Math.min(available - responseMinimum, requestedHeight),
          );
          heights[1] = available - heights[0];
        }
      }
      const railHeight = overflowing ? availableHeight : naturalHeight;
      const heightValue = `${Math.round(railHeight * 100) / 100}px`;
      if (aside.style.getPropertyValue('--operation-json__rail-height') !== heightValue)
        aside.style.setProperty('--operation-json__rail-height', heightValue);
      cards.forEach((card, index) => {
        const flex = `0 0 ${Math.round(heights[index] * 100) / 100}px`;
        if (card.style.flex !== flex) card.style.flex = flex;
      });
    };

    /**
     * Coalesces content, header and viewport changes into one layout update per frame.
     * @param None; called by the size and structure observers.
     * @returns Nothing; schedules a measurement without responding to JSON scrolling.
     */
    const schedule = () => {
      if (frame === undefined) frame = requestAnimationFrame(distributeHeight);
    };
    /**
     * Keeps wheel gestures in the example area from scrolling the left document at a boundary.
     * @param event Wheel gesture on a card header, footer or JSON viewport.
     * @returns Nothing; preserves native JSON scrolling and browser zoom gestures.
     */
    const containWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return;
      const body =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('.operation-json__body')
          : null;
      const canScrollY =
        body &&
        (event.deltaY < 0
          ? body.scrollTop > 0
          : event.deltaY > 0 && body.scrollTop + body.clientHeight < body.scrollHeight - 1);
      const canScrollX =
        body &&
        (event.deltaX < 0
          ? body.scrollLeft > 0
          : event.deltaX > 0 && body.scrollLeft + body.clientWidth < body.scrollWidth - 1);
      if (!canScrollY && !canScrollX) event.preventDefault();
    };
    const resizeObserver = new ResizeObserver(schedule);
    const mutationObserver = new MutationObserver(schedule);
    mutationObserver.observe(rail, { childList: true });
    if (scrollport) mutationObserver.observe(scrollport, { childList: true });
    window.addEventListener('resize', schedule);
    rail.addEventListener('wheel', containWheel, { passive: false });
    distributeHeight();
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', schedule);
      rail.removeEventListener('wheel', containWheel);
    };
  }, []);

  /**
   * Changes the request format in both the parameter card and its JSON example.
   * @param value Selected request Content-Type.
   * @returns Nothing; clears choices belonging to the previous content definition.
   */
  const changeRequestContentType = (value: string) => {
    markPendingSelection('request');
    if (value === activeRequestContentType) return;
    setActiveRequestContentType(value);
    setActiveRequestExampleKey('');
    setRequestVariants(new Map());
  };

  /**
   * Selects the response shared by the parameter view and example card.
   * @param value Documented HTTP response code.
   * @returns Nothing; resets the format, named example and branch choices for the new response.
   */
  const changeResponseCode = (value: string) => {
    markPendingSelection('response');
    if (value === responseCode) return;
    setActiveResponseCode(value);
    setActiveResponseContentType(
      getDefaultContentType(responseEntries.find(([code]) => code === value)?.[1].content),
    );
    setActiveResponseExampleKey('');
    setResponseVariants(new Map());
  };

  /**
   * Selects a response media type without retaining another format's example or structure choices.
   * @param value Selected response Content-Type.
   * @returns Nothing; updates both parameter and example views.
   */
  const changeResponseContentType = (value: string) => {
    markPendingSelection('response');
    if (value === responseContentType) return;
    setActiveResponseContentType(value);
    setActiveResponseExampleKey('');
    setResponseVariants(new Map());
  };

  return (
    <div className="legacy-operation">
      <div className="legacy-operation__layout">
        <main className="legacy-operation__main">
          <OperationHeroCard
            document={document}
            key={`hero:${operation.method}:${operation.path}`}
            onOpenPlayground={() => onOpenPlayground(requestVariants)}
            operation={operation}
            requestPrefix={requestPrefix}
          />

          <RequestParameters
            contentType={activeRequestContentType}
            key={`${operation.method}:${operation.path}`}
            onContentTypeChange={changeRequestContentType}
            operation={operation}
            schemas={schemas}
            variants={requestVariants}
            onVariantsChange={(value) => {
              markPendingSelection('request');
              setRequestVariants(value);
            }}
          />

          <ResponseParameters
            components={document.components}
            key={`response:${operation.method}:${operation.path}`}
            operation={operation}
            responseCode={responseCode}
            onResponseCodeChange={changeResponseCode}
            contentType={responseContentType}
            onContentTypeChange={changeResponseContentType}
            variants={responseVariants}
            onVariantsChange={(value) => {
              markPendingSelection('response');
              setResponseVariants(value);
            }}
            exampleKey={activeResponseExampleKey}
          />
        </main>

        <aside className="legacy-operation__aside">
          <div
            className="legacy-operation__aside-stack operation-json__example-rail"
            ref={exampleRailRef}
          >
            {Object.keys(requestContent ?? {}).length > 0 && (
              <JsonExampleCard
                key={`request-json:${operation.method}:${operation.path}`}
                direction="request"
                components={document.components}
                content={requestContent}
                contentType={activeRequestContentType}
                onContentTypeChange={changeRequestContentType}
                exampleKey={activeRequestExampleKey}
                onExampleChange={(value) => {
                  markPendingSelection('request');
                  setActiveRequestExampleKey(value);
                  setRequestVariants(new Map());
                }}
                variants={requestVariants}
                onVariantsChange={(value) => {
                  markPendingSelection('request');
                  setRequestVariants(value);
                }}
                description={operation.requestBody?.description}
              />
            )}
            {response && (
              <JsonExampleCard
                key={`response-json:${operation.method}:${operation.path}:${responseCode}`}
                direction="response"
                components={document.components}
                content={response.content}
                contentType={responseContentType}
                onContentTypeChange={changeResponseContentType}
                exampleKey={activeResponseExampleKey}
                onExampleChange={(value) => {
                  markPendingSelection('response');
                  setActiveResponseExampleKey(value);
                  setResponseVariants(new Map());
                }}
                variants={responseVariants}
                onVariantsChange={(value) => {
                  markPendingSelection('response');
                  setResponseVariants(value);
                }}
                description={response.description === 'OK' ? undefined : response.description}
                unresolvedReference={response.unresolvedReference}
                heading={
                  responseEntries.length > 1 ? (
                    <SegmentedControl
                      autoWidth
                      ariaLabel="JSON 响应状态码"
                      className={`operation-json__statuses tone-${responseCode[0]}`}
                      value={responseCode}
                      onChange={changeResponseCode}
                      options={responseEntries.map(([value, definition]) => ({
                        value,
                        label: value,
                        title: definition.description,
                      }))}
                    />
                  ) : (
                    <span className={`operation-json__single-code tone-${responseCode[0]}`}>
                      <b>{responseCode}</b>
                      {response.description === 'OK' && <span>OK</span>}
                    </span>
                  )
                }
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
});
