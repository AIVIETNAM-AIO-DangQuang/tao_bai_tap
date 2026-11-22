import type { Connect, Plugin, ResolvedConfig } from 'vite'
import { adHeadTags, adsLive, adsTxtLine, parseAdConfig } from './src/ads/parse.ts'

/** Các trang HTML của site (trang chủ là app, còn lại là trang nội dung tĩnh). */
export const SITE_PAGES = [
  'index.html',
  'huong-dan.html',
  'gioi-thieu.html',
  'chinh-sach-bao-mat.html',
  'dieu-khoan.html',
  'lien-he.html',
]

/** Đường dẫn "sạch" như trên Cloudflare Pages: index.html -> '', huong-dan.html -> 'huong-dan'. */
export const cleanPath = (page: string) => (page === 'index.html' ? '' : page.replace(/\.html$/, ''))

/**
 * Khi chạy dev/preview trên máy: chuyển /huong-dan thành /huong-dan.html,
 * để các link không đuôi .html mở đúng trang giống như trên Cloudflare Pages.
 */
const cleanUrlMiddleware: Connect.NextHandleFunction = (req, _res, next) => {
  const [pathname, query = ''] = (req.url ?? '').split('?')
  const page = pathname.replace(/^\//, '').replace(/\/$/, '') + '.html'
  if (page !== 'index.html' && SITE_PAGES.includes(page)) req.url = `/${page}${query ? '?' + query : ''}`
  next()
}

/**
 * Plugin của site:
 * - Khi build: chèn script quảng cáo + thẻ xác minh AdSense vào <head> mọi trang (Google cần thấy mã trong HTML),
 *   và thẻ canonical khi có VITE_SITE_URL.
 * - Sinh ads.txt (AdSense), robots.txt và sitemap.xml (khi có VITE_SITE_URL).
 * Khi chạy dev không chèn gì: các vị trí quảng cáo chỉ là khung giả.
 */
export function sitePlugin(env: Record<string, string>): Plugin {
  const ads = parseAdConfig(env)
  const siteUrl = env.VITE_SITE_URL?.trim().replace(/\/+$/, '')
  let config: ResolvedConfig

  return {
    name: 'scan-bai-site',
    configResolved(c) {
      config = c
    },
    configureServer(server) {
      server.middlewares.use(cleanUrlMiddleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(cleanUrlMiddleware)
    },
    buildStart() {
      if (config.command !== 'build') return
      if (ads.warning) this.warn(ads.warning)
      if (!siteUrl) this.warn('Chưa đặt VITE_SITE_URL nên không sinh sitemap.xml và thẻ canonical')
    },
    transformIndexHtml(html, ctx) {
      if (config.command !== 'build') return html
      const tags: string[] = []
      if (siteUrl) {
        const page = ctx.path.replace(/^\//, '')
        tags.push(`<link rel="canonical" href="${siteUrl}/${cleanPath(page)}" />`)
      }
      if (adsLive(ads)) tags.push(adHeadTags(ads))
      return tags.length ? html.replace('</head>', `    ${tags.join('\n    ')}\n  </head>`) : html
    },
    generateBundle() {
      if (ads.provider === 'adsense' && ads.adsenseClient) {
        this.emitFile({ type: 'asset', fileName: 'ads.txt', source: adsTxtLine(ads.adsenseClient) + '\n' })
      }
      const robots = ['User-agent: *', 'Allow: /', siteUrl ? `Sitemap: ${siteUrl}/sitemap.xml` : ''].filter(Boolean)
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots.join('\n') + '\n' })
      if (siteUrl) {
        const urls = SITE_PAGES.map((p) => `  <url><loc>${siteUrl}/${cleanPath(p)}</loc></url>`)
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
        })
      }
    },
  }
}
