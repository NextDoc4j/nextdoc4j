import teamCacheData from '@/public/team-cache.json';
import { GiteeMark, GithubMark } from '@/components/platform-marks';
import { Globe, MapPin } from 'lucide-react';

type TeamMember = {
  login: string;
  platform?: string;
  name?: string;
  displayName?: string;
  avatar_url: string;
  html_url?: string;
  role: string;
  skills: string[];
  location?: string;
  social: { github?: string; gitee?: string };
};

type TeamCache = { members?: TeamMember[] };
type Profile = { label: string; href: string; platform: 'github' | 'gitee' | 'website' };

const teamMembers = (teamCacheData as TeamCache).members ?? [];

export function TeamShowcase() {
  return (
    <div className="nd-team-grid not-prose my-6">
      {teamMembers.map((member) => {
        const displayName = member.displayName || member.name || member.login;
        const profiles: Profile[] = [];
        if (member.social.github) profiles.push({ label: 'GitHub', href: `https://github.com/${member.social.github}`, platform: 'github' });
        if (member.social.gitee) profiles.push({ label: 'Gitee', href: `https://gitee.com/${member.social.gitee}`, platform: 'gitee' });
        if (member.html_url && !profiles.some((profile) => profile.href === member.html_url)) {
          profiles.push({ label: '个人主页', href: member.html_url, platform: 'website' });
        }
        return (
          <article key={`${member.platform ?? 'member'}-${member.login}`} className="nd-member-card">
            <p className="nd-member-role">{member.role}</p>
            <div className="nd-member-identity">
              <div>
                <h3 className="nd-member-name">{displayName}</h3>
                {member.location ? <p className="nd-member-location"><MapPin aria-hidden="true" />{member.location}</p> : null}
              </div>
              <img className="nd-member-avatar" src={member.avatar_url} alt={`${displayName} 的头像`} width={112} height={112} loading="lazy" />
            </div>
            {member.skills.length > 0 ? <ul className="nd-member-skills" aria-label="技术栈">{member.skills.map((skill) => <li key={skill}>{skill}</li>)}</ul> : null}
            <div className="nd-member-footer">
              <span className="nd-member-handle">@{member.login}</span>
              <div className="nd-member-profiles">
                {profiles.map(({ label, href, platform }) => (
                  <a key={href} href={href} target="_blank" rel="noopener noreferrer" data-platform={platform} aria-label={`${displayName} 的 ${label}`} title={`${displayName} · ${label}`}>
                    {platform === 'github' ? <GithubMark /> : platform === 'gitee' ? <GiteeMark /> : <Globe aria-hidden="true" />}
                  </a>
                ))}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
