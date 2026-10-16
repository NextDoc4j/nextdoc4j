import {defineConfig} from 'vitepress'

const SITE_URL = 'https://nextdoc4j.top'

export default defineConfig({
    title: "NextDoc4j",
    description: "现代化 API 文档 UI 工具 - 专为 SpringDoc 设计",

    // 启用 Git 支持以获取最后更新时间
    lastUpdated: true,

    // 站点地图和 SEO
    sitemap: {
        hostname: SITE_URL
    },

    head: [
        ['link', {rel: 'icon', href: '/logo/favicon.ico'}],
        ['link', {rel: 'canonical', href: SITE_URL}],
        ['meta', {name: 'theme-color', content: '#3c82f6'}],
        ['meta', {name: 'author', content: 'NextDoc4j Team'}],
        ['meta', {name: 'keywords', content: 'NextDoc4j, API文档, SpringDoc, OpenAPI, Swagger UI替代, Java文档工具'}],
        ['meta', {property: 'og:type', content: 'website'}],
        ['meta', {property: 'og:url', content: SITE_URL}],
        ['meta', {property: 'og:title', content: 'NextDoc4j - 现代化 API 文档工具'}],
        ['meta', {property: 'og:description', content: '专为 SpringDoc 和 OpenAPI 3 设计的现代化文档界面'}],
        ['meta', {property: 'og:image', content: `${SITE_URL}/logo/logo.png`}],
        ['meta', {property: 'og:site_name', content: 'NextDoc4j'}],
        ['meta', {name: 'twitter:card', content: 'summary_large_image'}],
        ['meta', {name: 'twitter:title', content: 'NextDoc4j - 现代化 API 文档工具'}],
        ['meta', {name: 'twitter:description', content: '专为 SpringDoc 和 OpenAPI 3 设计的现代化文档界面'}],
    ],

    themeConfig: {
        logo: '/logo/logo.png',
        siteTitle: 'NextDoc4j',

        nav: [
            {text: '首页', link: '/'},
            {text: '指南', link: '/guide/'},
            {text: '开发', link: '/development/'},
            {
                text: '更多',
                items: [
                    {text: '加入讨论群', link: '/more/join-group'},
                    {text: '贡献指南', link: '/more/contribute'},
                    {text: '更新日志', link: '/more/changelog'},
                    {text: 'FAQ', link: '/more/faq'},
                    {text: '社区团队', link: '/more/team/team'}
                ]
            }
        ],

        sidebar: {
            '/guide/': [
                {
                    text: '开始',
                    collapsed: false,
                    items: [
                        {text: '概述', link: '/guide/'},
                        {text: '快速开始', link: '/guide/start/started'}
                    ]
                },
                {
                    text: '配置说明',
                    collapsed: false,
                    items: [
                        {text: '基础配置', link: '/guide/config/basicconfiguration'},
                        {text: '品牌配置', link: '/guide/config/brandconfiguration'},
                        {text: '简单认证配置', link: '/guide/config/authconfiguration'},
                        {text: 'markdown文档配置', link: '/guide/config/markdownIntegrationConfiguration'}
                    ]
                },
                {
                    text: '界面功能',
                    collapsed: false,
                    items: [
                        {text: '功能总览', link: '/guide/ui/overview'},
                        {text: '文档浏览与调试', link: '/guide/ui/browse-debug'},
                        {text: '认证与权限界面', link: '/guide/ui/security-permissions'},
                        {text: '网关聚合界面', link: '/guide/ui/gateway-ui'},
                        {text: '全局搜索与导出', link: '/guide/ui/search-export'}
                    ]
                },
                {
                    text: '插件使用',
                    collapsed: false,
                    items: [
                        {text: '枚举插件', link: '/guide/plugin/enum'},
                        {text: '认证展示插件', link: '/guide/plugin/authentication'},
                        {text: 'Sa-Token 权限码插件', link: '/guide/plugin/satoken'},
                        {text: '网关聚合插件', link: '/guide/plugin/gateway'}
                    ]
                }
            ],

            '/development/': [
                {
                    text: '开发指南',
                    collapsed: false,
                    items: [
                        {text: '前端开发', link: '/development/'},
                        {text: '后端开发', link: '/development/backend'}
                    ]
                }
            ],
        },

        footer: {
            copyright: [
                'Copyright © 2025 <a href="https://nextdoc4j.top/" target="_blank" rel="noopener noreferrer">NextDoc4j 版权所有</a>',
                '<a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">浙ICP备2025151976号-2</a>'
            ].join('<br>')
        },

        docFooter: {
            prev: '上一页',
            next: '下一页'
        },

        outline: {
            level: 'deep',
            label: '目录'
        },

        lastUpdated: {
            text: '最后更新于',
            formatOptions: {
                dateStyle: 'short',
                timeStyle: 'medium'
            }
        },

        returnToTopLabel: '回到顶部',
        sidebarMenuLabel: '菜单',
        darkModeSwitchLabel: '主题',
        lightModeSwitchTitle: '切换到浅色模式',
        darkModeSwitchTitle: '切换到深色模式',

        socialLinks: [
            {
                icon: {
                    svg: '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>GitHub</title><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>'
                },
                link: 'https://github.com/NextDoc4j'
            },
            {
                icon: {
                    svg: '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Gitee</title><path d="M11.984 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.016 0zm6.09 5.333c.328 0 .593.266.592.593v1.482a.594.594 0 0 1-.593.592H9.777c-.982 0-1.778.796-1.778 1.778v5.63c0 .327.266.592.593.592h5.63c.982 0 1.778-.796 1.778-1.778v-.296a.593.593 0 0 0-.592-.593h-4.15a.592.592 0 0 1-.592-.592v-1.482a.593.593 0 0 1 .593-.592h6.815c.327 0 .593.265.593.592v3.408a4 4 0 0 1-4 4H5.926a.593.593 0 0 1-.593-.593V9.778a4.444 4.444 0 0 1 4.445-4.444h8.296z" fill="#C71D23"/></svg>'
                },
                link: 'https://gitee.com/NextDoc4j'
            },
            {
                icon: {
                    svg: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <title>Gitcode</title>
            <image href="/logo/gitcode.png" width="24" height="24"/></svg>`
                },
                link: 'https://gitcode.com/NextDoc4j'
            }
        ],

        search: {
            provider: 'local',
            options: {
                locales: {
                    root: {
                        translations: {
                            button: {
                                buttonText: '搜索文档',
                                buttonAriaLabel: '搜索文档'
                            },
                            modal: {
                                noResultsText: '无法找到相关结果',
                                resetButtonTitle: '清除查询条件',
                                footer: {
                                    selectText: '选择',
                                    navigateText: '切换'
                                }
                            }
                        }
                    }
                }
            }
        }
    },

    markdown: {
        theme: {
            light: 'github-light',
            dark: 'github-dark'
        },
        lineNumbers: true
    }
})
