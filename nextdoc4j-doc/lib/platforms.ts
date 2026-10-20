export type PlatformId = 'github' | 'gitee' | 'gitcode';

export type PlatformLink = {
  id: PlatformId;
  name: string;
  href: string;
  stars: number;
};

/**
 * Star counts are intentionally kept in the static site data. The docs site is
 * exported as HTML, so rendering these from a browser-side API request would
 * make the navigation shift and would fail when a provider rate-limits CORS
 * requests. Refresh the values when preparing a release.
 */
export const platformLinks: PlatformLink[] = [
  {
    id: 'github',
    name: 'GitHub',
    href: 'https://github.com/NextDoc4j/nextdoc4j',
    stars: 48,
  },
  {
    id: 'gitee',
    name: 'Gitee',
    href: 'https://gitee.com/nextdoc4j/nextdoc4j',
    stars: 35,
  },
  {
    id: 'gitcode',
    name: 'GitCode',
    href: 'https://gitcode.com/NextDoc4j/nextdoc4j',
    stars: 4,
  },
];
