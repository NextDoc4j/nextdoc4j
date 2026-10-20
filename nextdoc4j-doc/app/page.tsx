import { HomePage } from '@/components/home-page';
import { baseOptions } from '@/lib/layout.shared';
import { HomeLayout } from 'fumadocs-ui/layouts/home';

const homeBaseOptions = baseOptions({ includePlatforms: true });

const homeLinks = [
  { text: '首页', url: '/' },
  { text: '指南', url: '/guide' },
  { text: '开发', url: '/development' },
  {
    type: 'menu' as const,
    text: '更多',
    items: [
      { text: '加入讨论群', url: '/more/join-group' },
      { text: '贡献指南', url: '/more/contribute' },
      { text: '更新日志', url: '/more/changelog' },
      { text: 'FAQ', url: '/more/faq' },
      { text: '社区团队', url: '/more/team' },
    ],
  },
  ...(homeBaseOptions.links ?? []),
];

export default function Page() {
  return (
    <HomeLayout {...homeBaseOptions} links={homeLinks}>
      <HomePage />
    </HomeLayout>
  );
}
