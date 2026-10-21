'use client';

import { PlatformLinks } from '@/components/platform-links';
import { ThemeSwitch, type ThemeSwitchProps } from 'fumadocs-ui/layouts/shared/slots/theme-switch';

export function SidebarControls(props: ThemeSwitchProps) {
  return (
    <div className="nd-sidebar-controls">
      <PlatformLinks standalone />
      <ThemeSwitch {...props} />
    </div>
  );
}
