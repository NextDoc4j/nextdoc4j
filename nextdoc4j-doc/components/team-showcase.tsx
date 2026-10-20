import teamCacheData from '@/public/team-cache.json';

type TeamMember = {
  login: string;
  platform?: string;
  name?: string;
  avatar_url: string;
  html_url?: string;
  role: string;
  skills: string[];
  location?: string;
  social: { github?: string; gitee?: string };
};

type TeamCache = { members?: TeamMember[] };

const teamMembers = (teamCacheData as TeamCache).members ?? [];

const repositories = [
  ['GitHub', 'https://github.com/NextDoc4j'],
  ['Gitee', 'https://gitee.com/NextDoc4j'],
  ['GitCode', 'https://gitcode.com/NextDoc4j'],
] as const;

export function TeamShowcase() {
  return (
    <section className="not-prose my-8 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {teamMembers.map((member) => {
          const displayName = member.name || member.login;
          return (
            <article key={`${member.platform ?? 'member'}-${member.login}`} className="rounded-xl border border-fd-border bg-fd-card p-5">
              <div className="flex items-center gap-3">
                <img className="size-12 rounded-full border border-fd-border object-cover" src={member.avatar_url} alt={`${displayName} avatar`} loading="lazy" />
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-fd-foreground">{displayName}</h3>
                  <p className="text-sm text-fd-muted-foreground">{member.role}</p>
                </div>
              </div>
              {member.location ? <p className="mt-4 text-sm text-fd-muted-foreground">{member.location}</p> : null}
              {member.skills.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {member.skills.map((skill) => <span key={skill} className="rounded-full bg-fd-secondary px-2 py-0.5 text-xs text-fd-secondary-foreground">{skill}</span>)}
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                {member.html_url ? <a className="text-fd-primary hover:underline" href={member.html_url} target="_blank" rel="noreferrer">个人主页</a> : null}
                {member.social.github ? <a className="text-fd-primary hover:underline" href={`https://github.com/${member.social.github}`} target="_blank" rel="noreferrer">GitHub</a> : null}
                {member.social.gitee ? <a className="text-fd-primary hover:underline" href={`https://gitee.com/${member.social.gitee}`} target="_blank" rel="noreferrer">Gitee</a> : null}
              </div>
            </article>
          );
        })}
      </div>

      <div className="rounded-xl border border-fd-border bg-fd-card p-5">
        <h3 className="font-semibold text-fd-foreground">项目入口</h3>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {repositories.map(([name, href]) => <a key={name} className="text-fd-primary hover:underline" href={href} target="_blank" rel="noreferrer">{name}</a>)}
        </div>
        <p className="mt-5 text-sm leading-6 text-fd-muted-foreground">如果 NextDoc4j 对你有帮助，欢迎通过下面的方式支持项目维护。</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 sm:max-w-md">
          <img className="w-full rounded-lg border border-fd-border" src="/images/paymentcode/alipay-qr.jpg" alt="支付宝赞助二维码" loading="lazy" />
          <img className="w-full rounded-lg border border-fd-border" src="/images/paymentcode/wechat-qr.jpg" alt="微信赞助二维码" loading="lazy" />
        </div>
      </div>
    </section>
  );
}
