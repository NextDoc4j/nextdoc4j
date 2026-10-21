'use client';

import { Tooltip } from '@/components/rare-ui/tooltip';
import { GiteeMark, GithubMark } from '@/components/platform-marks';
import { platformLinks, type PlatformLink as PlatformLinkData } from '@/lib/platforms';

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

export function PlatformLinks({ standalone = false }: { standalone?: boolean }) {
  const links = (
    <div className="nd-platform-links">
      {platformLinks.map((platform) => (
        <PlatformLink key={platform.id} platform={platform} />
      ))}
    </div>
  );

  return standalone
    ? <div className="nd-platform-group nd-platform-group--standalone">{links}</div>
    : <li className="nd-platform-group">{links}</li>;
}
