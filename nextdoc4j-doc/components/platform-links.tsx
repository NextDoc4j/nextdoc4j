'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Tooltip } from '@/components/rare-ui/tooltip';
import { GiteeMark, GithubMark } from '@/components/platform-marks';
import { platformLinks, type PlatformId, type PlatformLink as PlatformLinkData } from '@/lib/platforms';

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

function PlatformMark({ platform }: { platform: PlatformLinkData }) {
  if (platform.id === 'github') return <GithubMark />;
  if (platform.id === 'gitee') return <GiteeMark />;
  return <GitCodeMark />;
}

function PlatformLink({ platform }: { platform: PlatformLinkData }) {
  return (
    <Tooltip
      content={
        <span className="nd-platform-stars">
          <span>{platform.name}</span>
          <StarMark />
          <span>{platform.stars}</span>
        </span>
      }
    >
      <a
        className="nd-platform-control"
        data-platform={platform.id}
        href={platform.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`打开 ${platform.name} 仓库`}
      >
        <span className="nd-platform-mark">
          <PlatformMark platform={platform} />
        </span>
      </a>
    </Tooltip>
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

function AccordionLink({
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

function PlatformAccordion() {
  const [expandedId, setExpandedId] = useState<PlatformId | null>(null);
  const group = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expandedId === null) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !group.current?.contains(event.target)) {
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
  }, [expandedId]);

  return (
    <div ref={group} className="nd-platform-links nd-platform-accordion">
      {platformLinks.map((platform) => (
        <AccordionLink
          key={platform.id}
          platform={platform}
          expanded={expandedId === platform.id}
          onToggle={() => setExpandedId((current) => current === platform.id ? null : platform.id)}
        />
      ))}
    </div>
  );
}

export function PlatformLinks({ standalone = false }: { standalone?: boolean }) {
  const links = standalone ? (
    <div className="nd-platform-links">
      {platformLinks.map((platform) => (
        <PlatformLink key={platform.id} platform={platform} />
      ))}
    </div>
  ) : <PlatformAccordion />;

  return standalone
    ? <div className="nd-platform-group nd-platform-group--standalone">{links}</div>
    : <li className="nd-platform-group">{links}</li>;
}
