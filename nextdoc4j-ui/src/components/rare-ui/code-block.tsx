import { AnimatedCopyButton } from './animated-copy-button';
// Adapted from Rare UI (https://rareui.com), copyright (c) 2026 Swami Malode.
// MIT + Commons Clause + Attribution; see ./LICENSE.
import { useMovingHighlight } from './use-moving-highlight';
import { Highlight, type PrismTheme } from 'prism-react-renderer';
import React, { useMemo, useRef, useSyncExternalStore } from 'react';

import { cn } from './utils';

export type CodeBlockProps = Omit<React.ComponentProps<'div'>, 'children'> & {
  /** The source code to render. */
  code: string;
  /** Prism language id, e.g. "tsx", "css", "json", "bash". */
  language?: string;
  /** Any hex color. The whole theme is built from shades of it. */
  accent?: string;
  /** "auto" follows the page theme; pass "dark" or "light" to pin it. */
  mode?: 'auto' | 'dark' | 'light';
  /** Filename or path shown in the header. Falls back to the language id when omitted. */
  filename?: string;
  /** Show the outer frame — background, border, rounded corners, and header. Turn off to render just the code. */
  showFrame?: boolean;
  /** Show the header bar. Ignored when the frame is off. */
  showHeader?: boolean;
  /** Show the line-number gutter. */
  showLineNumbers?: boolean;
  /** Show the copy-to-clipboard button. */
  showCopyButton?: boolean;
  /** Optional 1-based line numbers to highlight with an accent wash. Off when omitted. */
  highlightLines?: number[];
};
function resolvePageMode(): 'dark' | 'light' {
  const root = document.documentElement;
  if (root.classList.contains('dark')) return 'dark';
  if (root.classList.contains('light')) return 'light';
  // The workspace owns the palette, including explicit light over an OS dark preference.
  if (root.dataset.themePreference) return 'light';
  const attr = root.getAttribute('data-theme');
  if (attr === 'dark') return 'dark';
  if (attr === 'light') return 'light';
  // jsdom has no matchMedia
  if (typeof window.matchMedia !== 'function') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function subscribeToPageMode(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme', 'data-theme-preference'],
  });
  const media =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;
  // old Safari doesn't have addEventListener here
  media?.addEventListener?.('change', onChange);
  return () => {
    observer.disconnect();
    media?.removeEventListener?.('change', onChange);
  };
}

// the server can't know the theme, so assume dark
const serverMode = () => 'dark' as const;

const FALLBACK_HSL: [number, number, number] = [211, 100, 52];

function hexToHsl(hex: string): [number, number, number] {
  if (typeof hex !== 'string') return FALLBACK_HSL;
  let value = hex.replace('#', '');
  if (value.length === 4 || value.length === 8) {
    value = value.slice(0, value.length === 4 ? 3 : 6);
  }
  if (value.length === 3) {
    value = value
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  if (value.length !== 6 || [r, g, b].some(Number.isNaN)) return FALLBACK_HSL;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    default:
      h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s * 100, l * 100];
}

const hsl = (h: number, s: number, l: number, a = 1) => {
  const hue = ((h % 360) + 360) % 360;
  return a === 1
    ? `hsl(${hue.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%)`
    : `hsl(${hue.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}% / ${a})`;
};

function buildTheme(accent: string, mode: 'dark' | 'light' = 'dark') {
  const [h, s, l] = hexToHsl(accent);
  const tint = (lightness: number, sat = s) => hsl(h, sat, lightness);
  const dark = mode !== 'light';
  const accentTone = dark
    ? tint(Math.min(Math.max(l, 56), 70))
    : tint(Math.min(Math.max(l, 38), 50));
  // light mode just flips the lightness ramp
  const ramp = (lightness: number) => (dark ? lightness : 100 - lightness);

  const colors = dark
    ? {
        accent: accentTone,
        // Neutral chrome — matches the Rare UI preview surface (dark --card).
        bg: 'oklch(0.1822 0 0)',
        border: 'rgb(255 255 255 / 0.08)',
        headerBg: 'rgb(255 255 255 / 0.03)',
        plain: '#ffffff',
        muted: 'rgb(255 255 255 / 0.6)',
        gutter: 'rgb(255 255 255 / 0.28)',
        hoverWash: 'rgb(255 255 255 / 0.08)',
        floatBg: 'rgb(255 255 255 / 0.05)',
        selection: hsl(h, s, 58, 0.3),
        lineWash: hsl(h, s, 58, 0.1),
      }
    : {
        accent: accentTone,
        bg: 'oklch(0.985 0 0)',
        border: 'rgb(0 0 0 / 0.08)',
        headerBg: 'rgb(0 0 0 / 0.03)',
        plain: '#171717',
        muted: 'rgb(0 0 0 / 0.6)',
        gutter: 'rgb(0 0 0 / 0.32)',
        hoverWash: 'rgb(0 0 0 / 0.06)',
        floatBg: 'rgb(0 0 0 / 0.04)',
        selection: hsl(h, s, 45, 0.25),
        lineWash: hsl(h, s, 45, 0.08),
      };

  const theme: PrismTheme = {
    plain: { color: colors.plain, backgroundColor: 'transparent' },
    styles: [
      {
        types: ['comment', 'prolog', 'doctype', 'cdata'],
        style: { color: tint(ramp(42), s * 0.35), fontStyle: 'italic' },
      },
      { types: ['punctuation'], style: { color: tint(ramp(62), s * 0.3) } },
      { types: ['operator', 'combinator'], style: { color: tint(ramp(70), s * 0.4) } },
      {
        types: ['keyword', 'selector', 'atrule', 'important', 'tag'],
        style: { color: accentTone },
      },
      { types: ['string', 'char', 'inserted', 'url'], style: { color: tint(ramp(76)) } },
      { types: ['function'], style: { color: tint(ramp(88), s * 0.5) } },
      { types: ['attr-name'], style: { color: tint(ramp(78), s * 0.7), fontStyle: 'italic' } },
      {
        types: ['number', 'boolean', 'constant', 'symbol', 'deleted'],
        style: { color: tint(ramp(70)) },
      },
      {
        types: ['class-name', 'maybe-class-name', 'builtin'],
        style: { color: tint(ramp(93), s * 0.35) },
      },
      { types: ['property', 'variable', 'parameter'], style: { color: tint(ramp(97), s * 0.15) } },
      { types: ['regex'], style: { color: tint(ramp(72), s * 0.6) } },
    ],
  };

  return { colors, theme };
}

/* ------------------------------- copy button ------------------------------- */

function CopyButton({ code, floating }: { code: string; floating?: boolean }) {
  return (
    <AnimatedCopyButton
      text={code}
      aria-label="复制代码"
      copiedLabel="已复制"
      data-slot="code-block-copy"
      errorMessage="复制失败，请手动选择代码复制"
      className={cn(
        'relative grid size-7 place-items-center rounded-lg text-[var(--cb-gutter)] outline-none transition-[background-color,color] duration-150 ease-out hover:bg-[var(--cb-hover-wash)] hover:text-[var(--cb-plain)] focus-visible:ring-2 focus-visible:ring-[var(--cb-accent)]/60',
        floating &&
          'absolute top-2.5 right-2.5 z-10 border border-[var(--cb-border)] bg-[var(--cb-float-bg)] backdrop-blur-md',
      )}
    />
  );
}

export function CodeBlock({
  code,
  language = 'tsx',
  accent = '#F75001',
  mode = 'auto',
  filename,
  showFrame = true,
  showHeader = true,
  showLineNumbers = true,
  showCopyButton = true,
  highlightLines,
  className,
  style,
  ...props
}: CodeBlockProps) {
  // don't crash on bad props
  const safeLanguage = typeof language === 'string' ? language : 'tsx';
  const viewportRef = useRef<HTMLDivElement>(null);
  const isJson = safeLanguage.toLowerCase() === 'json';
  useMovingHighlight(viewportRef, '[data-slot="code-block-line"]', undefined, isJson);
  const pageMode = useSyncExternalStore(subscribeToPageMode, resolvePageMode, serverMode);
  const safeMode = mode === 'light' || mode === 'dark' ? mode : pageMode;
  const { colors, theme } = useMemo(() => buildTheme(accent, safeMode), [accent, safeMode]);
  const trimmed = useMemo(() => {
    const source = typeof code === 'string' ? code : String(code ?? '');
    return source.replace(/^\n+/, '').trimEnd();
  }, [code]);
  const highlighted = useMemo(
    () => new Set(Array.isArray(highlightLines) ? highlightLines : []),
    [highlightLines],
  );

  const cssVars = {
    '--cb-accent': colors.accent,
    '--cb-bg': colors.bg,
    '--cb-border': colors.border,
    '--cb-header-bg': colors.headerBg,
    '--cb-plain': colors.plain,
    '--cb-muted': colors.muted,
    '--cb-gutter': colors.gutter,
    '--cb-hover-wash': colors.hoverWash,
    '--cb-float-bg': colors.floatBg,
    '--cb-selection': colors.selection,
    '--cb-line-wash': colors.lineWash,
  } as React.CSSProperties;

  return (
    <div
      data-slot="code-block"
      data-frame={showFrame ? 'true' : undefined}
      className={cn(
        'group relative flex flex-col overflow-hidden text-left',
        showFrame && 'rounded-lg border border-[var(--cb-border)] bg-[var(--cb-bg)]',
        className,
      )}
      style={{ ...cssVars, ...style }}
      {...props}
    >
      {showFrame && showHeader && (
        <div
          data-slot="code-block-header"
          className="flex h-10 shrink-0 items-center gap-3 border-b border-[var(--cb-border)] bg-[var(--cb-header-bg)] px-3.5"
        >
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-[var(--cb-muted)]">
            {filename ?? safeLanguage}
          </span>
          {showCopyButton && <CopyButton code={trimmed} />}
        </div>
      )}

      {!(showFrame && showHeader) && showCopyButton && <CopyButton code={trimmed} floating />}

      <div
        ref={viewportRef}
        data-slot="code-block-viewport"
        role="region"
        aria-label={filename ?? `${safeLanguage} code`}
        tabIndex={0}
        className={cn(
          'min-h-0 flex-1 overflow-auto outline-none selection:bg-[var(--cb-selection)] focus-visible:ring-2 focus-visible:ring-[var(--cb-accent)]/40 [scrollbar-width:thin] [scrollbar-color:var(--cb-border)_transparent]',
          showFrame && 'py-3',
          isJson && 'rare-moving-code',
        )}
      >
        <Highlight code={trimmed} language={safeLanguage} theme={theme}>
          {({ tokens, getLineProps, getTokenProps }) => {
            const gutterWidth = `${String(tokens.length).length}ch`;
            return (
              <pre
                data-slot="code-block-pre"
                className="w-max min-w-full font-mono text-[13px] leading-6 [tab-size:4]"
              >
                {tokens.map((line, i) => {
                  const lineProps = getLineProps({ line });
                  return (
                    <div
                      key={i}
                      {...lineProps}
                      data-slot="code-block-line"
                      className={cn(
                        'relative flex min-w-full',
                        showFrame && 'px-3.5',
                        highlighted.has(i + 1) && 'bg-[var(--cb-line-wash)]',
                        lineProps.className,
                      )}
                    >
                      {showLineNumbers && (
                        <span
                          aria-hidden
                          className="mr-4 shrink-0 text-right text-[var(--cb-gutter)] select-none"
                          style={{ width: gutterWidth }}
                        >
                          {i + 1}
                        </span>
                      )}
                      <span className="pr-3.5">
                        {line.map((token, key) => (
                          <span key={key} {...getTokenProps({ token })} />
                        ))}
                      </span>
                    </div>
                  );
                })}
              </pre>
            );
          }}
        </Highlight>
      </div>
    </div>
  );
}

export default CodeBlock;
