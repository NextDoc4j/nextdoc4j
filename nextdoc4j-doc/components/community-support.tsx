import teamConfig from '@/scripts/team/team.config';
import { ImageZoom } from 'fumadocs-ui/components/image-zoom';
import { ArrowUpRight, Download } from 'lucide-react';

function QrImage({ src, alt, size }: { src: string; alt: string; size: number }) {
  return (
    <div className="nd-community-qr">
      <ImageZoom src={src} alt={alt} width={size} height={size} loading="lazy" className="block h-auto w-full" />
    </div>
  );
}

function SaveQr({ src, filename }: { src: string; filename: string }) {
  return (
    <a className="nd-save-qr" href={src} download={filename}>
      <Download aria-hidden="true" />保存二维码
    </a>
  );
}

export function CommunityContact() {
  const { wechatQr, remark } = teamConfig.community;

  return (
    <div className="nd-community-contact not-prose my-6">
      <div className="nd-contact-copy">
        <h3>从添加一位维护者开始。</h3>
        <ol className="nd-contact-steps">
          <li>微信扫码，添加维护者好友</li>
          <li>备注 <code>{remark}</code>，说明希望加入讨论群</li>
          <li>好友通过后，由维护者邀请入群</li>
        </ol>
      </div>
      <div className="nd-contact-code">
        <QrImage src={wechatQr} alt="添加 NextDoc4j 维护者的微信好友二维码" size={964} />
        <SaveQr src={wechatQr} filename="nextdoc4j-maintainer-wechat.png" />
      </div>
    </div>
  );
}

export function CommunitySponsorship() {
  const { sponsor } = teamConfig;
  if (!sponsor.enabled) return null;

  const payments = [
    { name: '微信支付', src: sponsor.payments?.wechat, size: 728, filename: 'nextdoc4j-sponsor-wechat.png' },
    { name: '支付宝', src: sponsor.payments?.alipay, size: 694, filename: 'nextdoc4j-sponsor-alipay.png' },
  ];

  return (
    <div className="nd-sponsorship not-prose my-6">
      <div className="nd-sponsor-copy">
        <img src="/logo/logo.png" width={28} height={32} alt="" className="nd-sponsor-logo" />
        <h3>支持<span>NextDoc4j</span></h3>
        <p>感谢你对项目的认可，<br />也感谢每一份支持。</p>
        <a href="/more/contribute" className="nd-sponsor-contribute">也欢迎参与贡献<ArrowUpRight aria-hidden="true" /></a>
      </div>
      <div className="nd-sponsor-grid">
        {payments.map(({ name, src, size, filename }) => src ? (
          <article key={name} className="nd-sponsor-card">
            <h4>{name}</h4>
            <QrImage src={src} alt={`支持 NextDoc4j 的${name}赞助二维码`} size={size} />
            <SaveQr src={src} filename={filename} />
          </article>
        ) : null)}
      </div>
    </div>
  );
}
