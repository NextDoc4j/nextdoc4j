// 类型定义
interface SocialLinks {
    github?: string
    gitee?: string
}

interface UserConfig {
    username: string
    role: string
    skills?: string[]
    displayName?: string
    location?: string
    avatar?: string
    social?: SocialLinks
    githubUsername?: string
    giteeUsername?: string
}

interface Team {
    platform: 'github' | 'gitee'
    users: UserConfig[]
}

interface ProjectConfig {
    githubOrgHome?: string
    giteeOrgHome?: string
    gitcodeOrgHome?: string
}

interface PaymentMethods {
    alipay?: string
    wechat?: string
}

interface CommunityConfig {
    wechatQr: string
    remark: string
}

interface SponsorConfig {
    enabled: boolean
    payments?: PaymentMethods
    gratitudeText?: string
    suggestedAmounts?: number[]
    supporters?: Array<{
        name: string
        avatar: string
        amount?: number
    }>
}


interface TeamConfiguration {
    teams: Team[]
    project: ProjectConfig
    community: CommunityConfig
    sponsor: SponsorConfig
}

// 配置导出
const teamConfig: TeamConfiguration = {
    // 团队配置
    teams: [
        {
            platform: 'gitee',
            users: [
                {
                    username: 'wenjing_1129',
                    role: '前端开发工程师',
                    skills: ['Vue.js', 'React', 'TypeScript', 'Node.js'],
                    location: '浙江·杭州',
                    social: {
                        github: 'Mm-Dxx',
                        gitee: 'wenjing_1129'
                    }
                },
                {
                    username: 'dom-w',
                    role: '后端开发工程师',
                    skills: ['Java', 'Spring Boot', 'Vue.js', 'MySQL'],
                    location: '浙江·杭州',
                    social: {
                        github: 'Time-w',
                        gitee: 'dom-w'
                    }
                }
            ]
        }
    ],

    // 项目配置
    project: {
        githubOrgHome: 'https://github.com/NextDoc4j',
        giteeOrgHome: 'https://gitee.com/NextDoc4j',
        gitcodeOrgHome: 'https://gitcode.com/NextDoc4j'
    },

    // 添加维护者后邀请入群，不使用有时效的群二维码。
    community: {
        wechatQr: '/images/community/maintainer-wechat.png',
        remark: 'nextdoc4j'
    },

    // 赞助配置
    sponsor: {
        enabled: true,
        payments: {
            alipay: '/images/community/sponsor-alipay.png',
            wechat: '/images/community/sponsor-wechat.png'
        }
    }
}

export default teamConfig

// 导出类型定义供其他文件使用
export type {
    SocialLinks,
    UserConfig,
    Team,
    ProjectConfig,
    PaymentMethods,
    CommunityConfig,
    SponsorConfig,
    TeamConfiguration
}
