import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { PlatformLinks } from '@/components/platform-links';
import { appName, gitConfig } from './shared';

export function baseOptions({
  includePlatforms = false,
  includeGithub = !includePlatforms,
}: { includePlatforms?: boolean; includeGithub?: boolean } = {}): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="nd-brand-mark">
          <img src="/logo/logo.png" alt="" width="24" height="27" />
          <span>{appName}</span>
        </span>
      ),
    },
    githubUrl: includeGithub ? `https://github.com/${gitConfig.user}/${gitConfig.repo}` : undefined,
    links: includePlatforms
      ? [{ type: 'custom' as const, secondary: true, children: <PlatformLinks /> }]
      : undefined,
  };
}
