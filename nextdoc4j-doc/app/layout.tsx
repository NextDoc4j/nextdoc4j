import { Provider } from '@/components/provider';
import type { Metadata } from 'next';
import './global.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://nextdoc4j.top'),
  title: 'NextDoc4j',
  description: '面向 SpringDoc 和 OpenAPI 3 的现代化 API 文档与在线调试工作台。',
  icons: { icon: '/logo/favicon.ico' },
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen" suppressHydrationWarning>
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
