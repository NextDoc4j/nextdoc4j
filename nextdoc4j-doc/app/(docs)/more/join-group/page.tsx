import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '加入讨论群',
  robots: { index: false, follow: true },
  alternates: { canonical: '/more/team' },
};

export default function JoinGroupRedirect() {
  // A static HTML redirect keeps existing links working on Nginx without a server runtime.
  const destination = '/more/team#加入讨论群';
  return (
    <>
      <meta httpEquiv="refresh" content={`0;url=${destination}`} />
      <p className="p-6 text-sm text-fd-muted-foreground">正在前往社区与支持页面。<Link className="text-fd-primary underline" href={destination}>添加维护者并加入讨论群</Link></p>
    </>
  );
}
