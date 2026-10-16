// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceLoading } from '../../src/components/workspace-loading';
import builtInBrandLogo from '../../src/assets/logo.png';

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('WorkspaceLoading component', () => {
  it('shows the custom brand separately from the actual loading hint', async () => {
    await act(async () =>
      root.render(
        <WorkspaceLoading mode="screen" title="支付中台" logo="https://example.com/pay-logo.png" />,
      ),
    );

    const titleEl = host.querySelector('.workspace-loading-title');
    expect(titleEl?.textContent).toBe('支付中台');
    expect(host.querySelector('.workspace-loading-sub')?.textContent).toBe('正在加载接口文档');

    const img = host.querySelector('img');
    expect(img?.getAttribute('src')).toBe('https://example.com/pay-logo.png');
    expect(img?.getAttribute('alt')).toBe('支付中台');
    expect(host.querySelector('.workspace-loading-root')?.classList.contains('size-screen')).toBe(
      true,
    );
  });

  it('falls back to the NextDoc4j brand when metadata is missing', async () => {
    await act(async () => root.render(<WorkspaceLoading mode="page" />));

    const titleEl = host.querySelector('.workspace-loading-title');
    expect(titleEl?.textContent).toBe('NextDoc4j');

    const img = host.querySelector('img');
    expect(img?.getAttribute('src')).toBe(builtInBrandLogo);
    expect(host.querySelector('.workspace-loading-root')?.classList.contains('size-page')).toBe(
      true,
    );
  });

  it('falls back to builtInBrandLogo if custom image encounters an error', async () => {
    await act(async () =>
      root.render(<WorkspaceLoading title="故障服务" logo="https://example.com/broken.png" />),
    );

    const img = host.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('https://example.com/broken.png');

    await act(async () => {
      img.dispatchEvent(new Event('error'));
    });

    expect(img.getAttribute('src')).toBe(builtInBrandLogo);
  });

  it('updates the loading hint without resetting the brand and keeps the activity line decorative', async () => {
    await act(async () =>
      root.render(<WorkspaceLoading title="支付中台" statusText="正在加载页面" />),
    );
    const img = host.querySelector('img');
    expect(host.querySelector('[role="status"]')?.textContent).toBe('支付中台正在加载页面');
    expect(host.querySelector('.workspace-loading-track')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
    expect(host.querySelector('[role="progressbar"]')).toBeNull();
    await act(async () => root.render(<WorkspaceLoading title="支付中台" statusText="" />));
    expect(host.querySelector('.workspace-loading-sub')).toBeNull();
    expect(host.querySelector('img')).toBe(img);
    expect(host.querySelector('.workspace-loading-title')?.textContent).toBe('支付中台');
  });

  it('does not repeatedly reload a failing built-in fallback logo', async () => {
    await act(async () => root.render(<WorkspaceLoading logo="https://example.com/broken.png" />));
    const img = host.querySelector('img')!;
    const assignSource = vi.spyOn(img, 'src', 'set');
    await act(async () => {
      img.dispatchEvent(new Event('error'));
      img.dispatchEvent(new Event('error'));
    });
    expect(assignSource).toHaveBeenCalledExactlyOnceWith(builtInBrandLogo);
  });
});
