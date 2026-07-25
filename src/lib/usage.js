// Cookieless usage counting (Umami). No-ops when the tracker was not built in.
//
// ⚠️ Do NOT rename this file to analytics.js / tracking.js — content blockers
// match those names by path and will refuse to load the module, which breaks
// the whole app in dev (the production bundle is one file, so it only bites
// locally, which makes it a nasty thing to debug).
//
// Pageviews are sent from here rather than by the tracker: it fires on
// pushState/replaceState but not on hashchange, so with hash routing it would
// miss every in-app navigation while logging one "pageview" per chart click.
// Hence data-auto-pageview="false" on the script tag.

const umami = () => (typeof window !== 'undefined' ? window.umami : undefined)

export function canonicalPath(route) {
  switch (route?.page) {
    case 'ministries':
      return '/ministries'
    case 'ministry':
      return `/ministry/${route.slug ?? ''}`
    case 'receipt':
      return '/receipt'
    case 'basics':
      return '/basics'
    default:
      return '/'
  }
}

export function trackPageview(route) {
  const u = umami()
  if (!u?.track) return
  try {
    const url = canonicalPath(route)
    u.track((props) => ({ ...props, url, title: document.title }))
  } catch {
    // analytics must never break the page
  }
}

export function trackEvent(name, data) {
  const u = umami()
  if (!u?.track) return
  try {
    u.track(name, data)
  } catch {
    // analytics must never break the page
  }
}
