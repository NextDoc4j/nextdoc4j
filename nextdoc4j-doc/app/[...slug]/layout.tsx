import { PlatformLinks } from '@/components/platform-links';
import { baseOptions } from '@/lib/layout.shared';
import { source } from '@/lib/source';
import { DocsLayout as FumadocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <FumadocsLayout
      tree={source.getPageTree()}
      {...baseOptions({ includeGithub: false })}
      sidebar={{ footer: <PlatformLinks standalone /> }}
    >
      {children}
    </FumadocsLayout>
  );
}
