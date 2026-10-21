'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  useFolderDepth,
  useSidebar,
} from 'fumadocs-ui/components/sidebar/base';
import type { SidebarPageTreeComponents } from 'fumadocs-ui/components/sidebar/page-tree';

const itemClassName =
  'relative flex flex-row items-center gap-2 rounded-lg p-2 text-start text-fd-muted-foreground wrap-anywhere [&_svg]:size-4 [&_svg]:shrink-0 transition-colors hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80 hover:transition-none data-[active=true]:bg-fd-primary/10 data-[active=true]:text-fd-primary';

function normalizePath(value: string) {
  return value.length > 1 ? value.replace(/\/$/, '') : value;
}

export function SidebarItemNode({ item }: Parameters<SidebarPageTreeComponents['Item']>[0]) {
  const pathname = usePathname();
  const { prefetch } = useSidebar();
  const depth = useFolderDepth();
  const active = normalizePath(pathname) === normalizePath(item.url);

  return (
    <Link
      href={item.url}
      target={item.external ? '_blank' : undefined}
      rel={item.external ? 'noopener noreferrer' : undefined}
      prefetch={prefetch}
      scroll={false}
      data-active={active}
      aria-current={active ? 'page' : undefined}
      className={itemClassName}
      style={{ paddingInlineStart: `calc(${2 + 3 * depth} * var(--spacing))` }}
    >
      {item.icon}
      {item.name}
    </Link>
  );
}
