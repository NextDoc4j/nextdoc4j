import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createServer } from 'node:net'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import process from 'node:process'
import { chromium } from 'playwright-core'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const host = '127.0.0.1'
const preferredPort = Number(process.env.RESPONSIVE_PORT || 4173)

const viewports = [
  { name: 'mobile-small', width: 320, height: 900 },
  { name: 'mobile', width: 375, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop-small', width: 1024, height: 900 },
  { name: 'desktop', width: 1440, height: 900 },
]

const pages = [
  '/',
  '/guide/index.html',
  '/guide/start/started.html',
  '/guide/config/basicconfiguration.html',
  '/guide/config/brandconfiguration.html',
  '/guide/config/authconfiguration.html',
  '/guide/config/markdownIntegrationConfiguration.html',
  '/guide/ui/overview.html',
  '/guide/ui/browse-debug.html',
  '/guide/ui/security-permissions.html',
  '/guide/ui/gateway-ui.html',
  '/guide/ui/search-export.html',
  '/guide/plugin/enum.html',
  '/guide/plugin/authentication.html',
  '/guide/plugin/satoken.html',
  '/guide/plugin/gateway.html',
  '/development/index.html',
  '/development/backend.html',
  '/more/join-group.html',
  '/more/contribute.html',
  '/more/changelog.html',
  '/more/faq.html',
  '/more/team/team.html',
]

const testPages = process.env.RESPONSIVE_PAGES
  ? pages.filter((page) => process.env.RESPONSIVE_PAGES.split(',').includes(page))
  : pages
const testViewports = process.env.RESPONSIVE_VIEWPORTS
  ? viewports.filter((viewport) => process.env.RESPONSIVE_VIEWPORTS.split(',').includes(viewport.name))
  : viewports

/**
 * 查找本机可用于无头测试的 Chrome/Chromium 可执行文件。
 * @returns {string} 浏览器可执行文件路径。
 */
function findBrowserPath() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean)

  const browserPath = candidates.find((candidate) => existsSync(candidate))
  if (!browserPath) {
    throw new Error(
      '未找到 Chrome/Chromium。请设置 CHROME_PATH，或安装本机 Chrome 后再执行 pnpm test:responsive。',
    )
  }
  return browserPath
}

/**
 * 等待 VitePress 预览服务启动并开始响应请求。
 * @param {string} url 预览服务地址。
 * @returns {Promise<void>} 服务可访问时完成。
 */
async function waitForPreview(url) {
  const deadline = Date.now() + 15000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // 预览服务尚未启动，继续轮询。
    }
    await delay(150)
  }
  throw new Error(`预览服务启动超时：${url}`)
}

/**
 * 查找从指定端口开始的可用本机端口，避免复用旧的预览服务。
 * @param {number} startPort 起始检测端口。
 * @returns {Promise<number>} 可供预览服务使用的端口。
 */
async function findAvailablePort(startPort) {
  for (let port = startPort; port < startPort + 20; port += 1) {
    const available = await new Promise((resolve) => {
      const server = createServer()
      server.once('error', () => resolve(false))
      server.listen(port, host, () => {
        server.close(() => resolve(true))
      })
    })

    if (available) return port
  }

  throw new Error(`未找到可用端口：${startPort}-${startPort + 19}`)
}

/**
 * 检查页面是否出现视口级横向溢出及关键布局缺失。
 * @param {import('playwright-core').Page} page 当前页面。
 * @param {string} route 当前路由。
 * @returns {Promise<{errors: string[]}>} 页面检查错误列表。
 */
async function inspectPage(page, route) {
  return page.evaluate((currentRoute) => {
    const errors = []
    const documentWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body?.scrollWidth || 0,
    )

    if (documentWidth > window.innerWidth + 1) {
      const overflowSources = Array.from(document.querySelectorAll('body *'))
        .map((element) => {
          const rect = element.getBoundingClientRect()
          const style = getComputedStyle(element)
          return {
            element,
            rect,
            style,
          }
        })
        .filter(({ element, rect, style }) => {
          if (rect.width <= window.innerWidth + 1) return false
          if (style.display === 'none' || style.visibility === 'hidden') return false
          if (element.scrollWidth > element.clientWidth + 1 && element.clientWidth <= window.innerWidth + 1) return false
          return true
        })
        .sort((left, right) => left.rect.width - right.rect.width)
        .slice(0, 3)
        .map(({ element, rect }) => {
          const className = typeof element.className === 'string' ? `.${element.className.split(/\s+/).filter(Boolean).join('.')}` : ''
          return `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${className}=${Math.round(rect.width)}px`
        })

      const sourceText = overflowSources.length > 0 ? `，来源：${overflowSources.join(', ')}` : ''
      errors.push(`页面横向溢出 ${documentWidth}px > ${window.innerWidth}px${sourceText}`)
    }

    const requiredSelector = currentRoute === '/' ? '.home-landing-page' : '.vp-doc'
    if (!document.querySelector(requiredSelector)) {
      errors.push(`缺少页面主体 ${requiredSelector}`)
    }

    const keySelectors = currentRoute === '/'
      ? [
          '.hero-headline',
          '.macos-window-card',
          '.macos-window-titlebar',
          '.terminal-shell-box',
          '.spec-table-box',
          '.community-cards-grid',
        ]
      : ['.vp-doc']

    for (const selector of keySelectors) {
      const element = document.querySelector(selector)
      if (!element) {
        errors.push(`缺少关键元素 ${selector}`)
        continue
      }

      const style = getComputedStyle(element)
      if (style.display === 'none' || style.visibility === 'hidden') continue

      const rect = element.getBoundingClientRect()
      if (rect.left < -1 || rect.right > window.innerWidth + 1) {
        errors.push(`${selector} 超出视口 [${Math.round(rect.left)}, ${Math.round(rect.right)}]`)
      }
    }

    return { errors }
  }, route)
}

const port = await findAvailablePort(preferredPort)
const baseUrl = `http://${host}:${port}`
const browserPath = findBrowserPath()
const previewProcess = spawn(
  process.execPath,
  [
    path.join(projectRoot, 'node_modules/vitepress/bin/vitepress.js'),
    'preview',
    '--host',
    host,
    '--port',
    String(port),
  ],
  { cwd: projectRoot, stdio: 'ignore' },
)

let browser
const failures = []
let checked = 0

try {
  await waitForPreview(`${baseUrl}/index.html`)
  browser = await chromium.launch({ executablePath: browserPath, headless: true })

  for (const viewport of testViewports) {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    const runtimeErrors = []

    page.on('pageerror', (error) => runtimeErrors.push(`运行时错误：${error.message}`))
    page.on('console', (message) => {
      if (message.type() === 'error') runtimeErrors.push(`控制台错误：${message.text()}`)
    })

    for (const route of testPages) {
      const response = await page.goto(`${baseUrl}${route}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      })
      await page.waitForTimeout(150)
      checked += 1

      const result = await inspectPage(page, route)
      const errors = [...result.errors, ...runtimeErrors.splice(0)]
      if (response && response.status() >= 400) {
        errors.push(`HTTP ${response.status()}`)
      }

      if (errors.length > 0) {
        failures.push(`${route} @ ${viewport.name}: ${errors.join('；')}`)
      }
    }

    await context.close()
  }
} finally {
  await browser?.close()
  previewProcess.kill('SIGTERM')
}

if (failures.length > 0) {
  console.error(`响应式检查失败（${failures.length} 项 / ${checked} 项）：`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  console.log(`响应式检查通过：${checked} 个页面视口组合无横向溢出。`)
}
