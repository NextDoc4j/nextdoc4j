'use client';

import { platformLinks, type PlatformId, type PlatformLink as PlatformLinkData } from '@/lib/platforms';
import { useEffect, useId, useState } from 'react';

function GithubMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function GiteeMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.984 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.016 0zm6.09 5.333c.328 0 .593.266.592.593v1.482a.594.594 0 0 1-.593.592H9.777c-.982 0-1.778.796-1.778 1.778v5.63c0 .327.266.592.593.592h5.63c.982 0 1.778-.796 1.778-1.778v-.296a.593.593 0 0 0-.592-.593h-4.15a.592.592 0 0 1-.592-.592v-1.482a.593.593 0 0 1 .593-.592h6.815c.327 0 .593.265.593.592v3.408a4 4 0 0 1-4 4H5.926a.593.593 0 0 1-.593-.593V9.778a4.444 4.444 0 0 1 4.445-4.444h8.296z" />
    </svg>
  );
}

function GitCodeMark() {
  return <img src="/logo/gitcode.png" alt="" width={20} height={20} />;
}

function StarMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
      <path d="m12 2.25 2.94 5.95 6.56.95-4.75 4.63 1.12 6.54L12 17.24l-5.87 3.08 1.12-6.54L2.5 9.15l6.56-.95L12 2.25Z" />
    </svg>
  );
}

function ExternalMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3h7v7" />
      <path d="M10 14 21 3" />
      <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
    </svg>
  );
}

function PlatformMark({ platform }: { platform: PlatformLinkData }) {
  if (platform.id === 'github') return <GithubMark />;
  if (platform.id === 'gitee') return <GiteeMark />;
  return <GitCodeMark />;
}

function PlatformLink({
  platform,
  expanded,
  onToggle,
}: {
  platform: PlatformLinkData;
  expanded: boolean;
  onToggle: () => void;
}) {
  const panelId = useId();

  return (
    <div className="nd-platform-control" data-platform={platform.id} data-expanded={expanded}>
      <button
        type="button"
        className="nd-platform-trigger"
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-label={`${expanded ? '收起' : '展开'} ${platform.name} Star 信息`}
        title={platform.name}
        onClick={onToggle}
      >
        <span className="nd-platform-mark">
          <PlatformMark platform={platform} />
        </span>
        <span className="sr-only">{platform.name}</span>
      </button>

      <div id={panelId} className="nd-platform-details" aria-hidden={!expanded}>
        <span className="nd-platform-stars" title={`${platform.stars} Stars`}>
          <StarMark />
          <span>{platform.stars}</span>
        </span>
        <a
          className="nd-platform-visit"
          href={platform.href}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={expanded ? 0 : -1}
          aria-label={`打开 ${platform.name} 仓库`}
        >
          <ExternalMark />
        </a>
      </div>
    </div>
  );
}

export function PlatformLinks({ standalone = false }: { standalone?: boolean }) {
  const [expandedId, setExpandedId] = useState<PlatformId | null>(null);

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('.nd-platform-group')) {
        setExpandedId(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpandedId(null);
    };

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const links = (
    <div className="nd-platform-links">
      {platformLinks.map((platform) => (
        <PlatformLink
          key={platform.id}
          platform={platform}
          expanded={expandedId === platform.id}
          onToggle={() => setExpandedId((current) => (current === platform.id ? null : platform.id))}
        />
      ))}
    </div>
  );

  return standalone
    ? <div className="nd-platform-group nd-platform-group--standalone">{links}</div>
    : <li className="nd-platform-group">{links}</li>;
}
