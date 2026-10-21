'use client';

import {
  SidebarFolder,
  SidebarFolderContent,
  SidebarFolderTrigger,
  useFolderDepth,
} from 'fumadocs-ui/components/sidebar/base';
import type { SidebarPageTreeComponents } from 'fumadocs-ui/components/sidebar/page-tree';
import { Children } from 'react';

const folderClassName =
  'relative flex w-full flex-row items-center gap-2 rounded-lg p-2 text-start font-medium text-fd-foreground wrap-anywhere [&_svg]:size-4 [&_svg]:shrink-0';

export function SidebarFolderNode({ item, children }: Parameters<SidebarPageTreeComponents['Folder']>[0]) {
  const parentDepth = useFolderDepth();

  return (
    <SidebarFolder collapsible={false} defaultOpen>
      <SidebarFolderTrigger
        className={folderClassName}
        style={{ paddingInlineStart: `calc(${2 + 3 * parentDepth} * var(--spacing))` }}
      >
        {item.icon}
        {item.name}
      </SidebarFolderTrigger>
      <SidebarFolderContent className="relative flex flex-col gap-0.5 pt-0.5">
        {Children.toArray(children)}
      </SidebarFolderContent>
    </SidebarFolder>
  );
}
