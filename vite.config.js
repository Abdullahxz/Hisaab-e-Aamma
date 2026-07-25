import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// Link-preview crawlers don't run JS and need absolute URLs, so the deploy
// origin has to be baked in at build time via SITE_URL. Without it the tags
// fall back to relative URLs, which Twitter/X may not resolve.
function socialMeta(site) {
  return {
    name: 'social-meta',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (site) return html.replaceAll('__SITE_URL__/', `${site}/`)
        // No origin known: relative image (best effort) and drop og:url
        // entirely — an empty og:url is worse than an absent one.
        return html
          .replace(/^[^\n]*property="og:url"[^\n]*\n/m, '')
          .replaceAll('__SITE_URL__/', '')
      },
    },
  }
}

// Opt-in per build so dev, PR builds and forks never report to production.
function analytics(websiteId, scriptSrc) {
  return {
    name: 'analytics-snippet',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const tag = websiteId
          ? `<script defer src="${scriptSrc}" data-website-id="${websiteId}" data-auto-track="true" data-auto-pageview="false"></script>`
          : ''
        return html.replace('<!--__ANALYTICS__-->', tag)
      },
    },
  }
}

export default defineConfig(({ mode, command }) => {
  // '' prefix => load every var from .env files as well as the shell
  const env = loadEnv(mode, process.cwd(), '')
  const site = (env.SITE_URL || '').trim().replace(/\/+$/, '')
  const umamiId = (env.UMAMI_WEBSITE_ID || '').trim()
  const umamiSrc = (env.UMAMI_SCRIPT_URL || 'https://cloud.umami.is/script.js').trim()

  if (command === 'build' && !site) {
    console.warn(
      '\n[social-meta] SITE_URL is not set — link previews will use relative URLs.' +
        '\n  For reliable previews build with:  SITE_URL=https://your.domain npm run build\n'
    )
  }
  if (command === 'build') {
    console.log(
      umamiId
        ? `[analytics] Umami enabled (website id ${umamiId.slice(0, 8)}…)`
        : '[analytics] UMAMI_WEBSITE_ID not set — building without analytics.'
    )
  }

  return {
    plugins: [react(), socialMeta(site), analytics(umamiId, umamiSrc)],
    // relative asset paths: the build works from any host and any sub-path
    base: './',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
