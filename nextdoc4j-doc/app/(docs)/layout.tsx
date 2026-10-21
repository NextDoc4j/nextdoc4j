import { SidebarControls } from '@/components/sidebar-controls';
import { SidebarFolderNode } from '@/components/sidebar-folder';
import { SidebarItemNode } from '@/components/sidebar-item';
import { SidebarMotion } from '@/components/sidebar-motion';
import { baseOptions } from '@/lib/layout.shared';
import { source } from '@/lib/source';
import { DocsLayout as FumadocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  // Keep the sidebar mounted when the document slug changes.
  return (
    <>
      <FumadocsLayout
        tree={source.getPageTree()}
        {...baseOptions({ includeGithub: false })}
        slots={{ themeSwitch: SidebarControls }}
        sidebar={{
          collapsible: true,
          components: { Folder: SidebarFolderNode, Item: SidebarItemNode },
          defaultOpenLevel: 3,
        }}
      >
        {children}
      </FumadocsLayout>
      <SidebarMotion />
    </>
  );
}
