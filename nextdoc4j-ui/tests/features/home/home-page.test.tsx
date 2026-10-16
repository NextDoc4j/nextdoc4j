// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from '../../../src/features/home/home-page';
import { getNotifications, removeNotification } from '../../../src/lib/notifications';
import type { OpenApiDocument } from '../../../src/types/openapi';

describe('HomePage', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    getNotifications().forEach(({ id }) => removeNotification(id));
  });

  it('updates active-service model statistics while retaining the gateway introduction', () => {
    const gatewayDocument: OpenApiDocument = {
      info: { title: 'Gateway Docs', version: '1.4.2' },
      openapi: '3.1.0',
      paths: {},
    };
    const serviceDocument: OpenApiDocument = {
      info: { title: 'File Service' },
      openapi: '3.1.0',
      paths: {},
      components: { schemas: { File: { type: 'object' }, Result: { type: 'object' } } },
    };
    const root = createRoot(container);
    const props = {
      document: gatewayDocument,
      isAggregation: true,
      markdownCount: 0,
      onNavigate: vi.fn(),
      onOpenMarkdown: vi.fn(),
      onSelectSettings: vi.fn(),
      operations: [],
      services: [],
    };
    act(() => root.render(<HomePage {...props} statisticsDocument={serviceDocument} />));

    const modelCard = [...container.querySelectorAll('.legacy-home__stat-card')].find(
      (card) => card.querySelector('.legacy-home__stat-label')?.textContent === '实体数据模型',
    );
    expect(modelCard?.querySelector('.legacy-home__stat-value')?.textContent).toBe('2');
    expect(container.querySelector('.legacy-home__title')?.textContent).toBe('Gateway Docs');

    act(() =>
      root.render(
        <HomePage
          {...props}
          statisticsDocument={{
            ...serviceDocument,
            components: { schemas: { User: { type: 'object' } } },
          }}
        />,
      ),
    );
    expect(modelCard?.querySelector('.legacy-home__stat-value')?.textContent).toBe('1');
    expect(container.querySelector('.legacy-home__title')?.textContent).toBe('Gateway Docs');
    act(() => root.unmount());
  });

  it('renders NextDoc4j fallback title and logo when info is completely empty', () => {
    const emptyDoc: OpenApiDocument = {
      info: undefined,
      openapi: '',
      paths: {},
    };

    const root = createRoot(container);
    act(() => {
      root.render(
        <HomePage
          document={emptyDoc}
          isAggregation={false}
          markdownCount={0}
          onNavigate={vi.fn()}
          onOpenMarkdown={vi.fn()}
          onSelectSettings={vi.fn()}
          operations={[]}
          services={[]}
        />,
      );
    });

    const titleEl = container.querySelector('.legacy-home__title');
    expect(titleEl?.textContent).toBe('NextDoc4j');

    const logoEl = container.querySelector('.legacy-home__logo');
    expect(logoEl).not.toBeNull();

    // No chips, no description, no meta bar
    expect(container.querySelector('.legacy-home__chips')).toBeNull();
    expect(container.querySelector('.legacy-home__description')).toBeNull();
    expect(container.querySelector('.legacy-home__meta-bar')).toBeNull();

    // Section heads have no hint paragraph
    const sectionHeadParagraphs = container.querySelectorAll('.legacy-home__section-head p');
    expect(sectionHeadParagraphs.length).toBe(0);

    act(() => {
      root.unmount();
    });
  });

  it('renders complete document info and version chips when info is provided', () => {
    const fullDoc: OpenApiDocument = {
      info: {
        contact: {
          email: 'test@example.com',
          name: 'Echo',
          url: 'https://example.com',
        },
        description: 'Detailed description for NextDoc4j API',
        license: {
          name: 'Apache 2.0',
          url: 'https://www.apache.org/licenses/LICENSE-2.0',
        },
        title: 'Custom API Title',
        version: '2.0.0',
      },
      openapi: '3.1.0',
      paths: {},
      servers: [{ url: 'http://localhost:8080' }],
    };

    const root = createRoot(container);
    act(() => {
      root.render(
        <HomePage
          document={fullDoc}
          isAggregation={false}
          markdownCount={2}
          onNavigate={vi.fn()}
          onOpenMarkdown={vi.fn()}
          onSelectSettings={vi.fn()}
          operations={[]}
          services={[]}
        />,
      );
    });

    const titleEl = container.querySelector('.legacy-home__title');
    expect(titleEl?.textContent).toBe('Custom API Title');

    const chipsEl = container.querySelector('.legacy-home__chips');
    expect(chipsEl).not.toBeNull();
    expect(chipsEl?.textContent).toContain('V 2.0.0');
    expect(chipsEl?.textContent).toContain('OpenAPI 3.1.0');

    const descEl = container.querySelector('.legacy-home__description');
    expect(descEl).not.toBeNull();
    expect(descEl?.textContent).toContain('Detailed description for NextDoc4j API');

    const metaBarEl = container.querySelector('.legacy-home__meta-bar');
    expect(metaBarEl).not.toBeNull();
    expect(metaBarEl?.textContent).toContain('http://localhost:8080');
    expect(metaBarEl?.textContent).toContain('Echo');
    expect(metaBarEl?.textContent).toContain('Apache 2.0');

    // Section heads should NOT have right-side hint text
    const sectionHeadParagraphs = container.querySelectorAll('.legacy-home__section-head p');
    expect(sectionHeadParagraphs.length).toBe(0);

    act(() => {
      root.unmount();
    });
  });

  it('correctly counts and displays HEAD and OPTIONS operations in method distribution', () => {
    const doc: OpenApiDocument = {
      info: { title: 'Options & Head API', version: '1.0.0' },
      openapi: '3.0.3',
      paths: {},
    };
    const operations = [
      {
        deprecated: false,
        description: 'Check service availability',
        group: 'System',
        method: 'head' as const,
        operationId: 'checkHealth',
        path: '/health',
        responses: {},
        searchText: 'health check',
        summary: 'Health Check',
        tags: ['System'],
      },
      {
        deprecated: false,
        description: 'CORS preflight',
        group: 'System',
        method: 'options' as const,
        operationId: 'optionsApi',
        path: '/api',
        responses: {},
        searchText: 'options api',
        summary: 'Options API',
        tags: ['System'],
      },
    ];

    const root = createRoot(container);
    act(() => {
      root.render(
        <HomePage
          document={doc}
          isAggregation={false}
          markdownCount={0}
          onNavigate={vi.fn()}
          onOpenMarkdown={vi.fn()}
          onSelectSettings={vi.fn()}
          operations={operations}
          services={[]}
        />,
      );
    });

    const statSub = container.querySelector('.legacy-home__stat-sub');
    expect(statSub?.textContent).toBe('包含 2 种 HTTP 方法');

    const legends = container.querySelectorAll('.legacy-home__method-legend span b');
    const legendTexts = Array.from(legends).map((el) => el.textContent);
    expect(legendTexts).toContain('HEAD');
    expect(legendTexts).toContain('OPTIONS');

    act(() => {
      root.unmount();
    });
  });

  it('handles clipboard copy with fallback and notifies on complete failure', async () => {
    const doc: OpenApiDocument = {
      info: { title: 'Test API', version: '1.0.0' },
      openapi: '3.0.3',
      paths: {},
      servers: [{ url: 'http://localhost:9000' }],
    };

    // Mock clipboard rejection
    const writeTextMock = vi.fn().mockRejectedValue(new Error('Permission denied'));
    vi.stubGlobal('navigator', { clipboard: { writeText: writeTextMock } });

    // Exercise cleanup when the legacy copy API throws.
    const execCommandMock = vi.fn().mockImplementation(() => {
      throw new Error('Copy unavailable');
    });
    const previousExecCommand = document.execCommand;
    document.execCommand = execCommandMock;

    const root = createRoot(container);
    act(() => {
      root.render(
        <HomePage
          document={doc}
          isAggregation={false}
          markdownCount={0}
          onNavigate={vi.fn()}
          onOpenMarkdown={vi.fn()}
          onSelectSettings={vi.fn()}
          operations={[]}
          services={[]}
        />,
      );
    });

    const copyBtn = container.querySelector('.legacy-home__host-pill') as HTMLButtonElement;
    expect(copyBtn).not.toBeNull();

    await act(async () => {
      copyBtn.focus();
      copyBtn.click();
    });

    expect(writeTextMock).toHaveBeenCalledWith('http://localhost:9000');
    expect(execCommandMock).toHaveBeenCalledWith('copy');
    expect(document.body.querySelector('textarea')).toBeNull();
    expect(document.activeElement).toBe(copyBtn);
    expect(getNotifications()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: '复制失败，请手动复制', tone: 'error' }),
      ]),
    );
    document.execCommand = previousExecCommand;

    act(() => {
      root.unmount();
    });
  });
});
