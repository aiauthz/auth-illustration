// Static SEO validator. Reads dist/, asserts every prerendered route
// has the meta tags, canonical, OG/Twitter, and JSON-LD a crawler needs.
// Exits non-zero on any failure so CI can gate releases on it.

import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DIST = join(ROOT, 'dist')

const seo = JSON.parse(await readFile(join(ROOT, 'src/data/seo.json'), 'utf8'))
const slides = JSON.parse(await readFile(join(ROOT, 'src/data/slides.json'), 'utf8'))

const SITE_URL = seo.site.url

const pages = [
  { path: '/', file: 'index.html' },
  { path: '/playground', file: 'playground/index.html' },
  ...slides.map((s) => ({ path: `/flows/${s.slug}`, file: `flows/${s.slug}/index.html` })),
]

const results = []
let failures = 0
let warnings = 0

function check(label, ok, detail = '') {
  if (ok === 'warn') {
    warnings++
    return { label, status: 'warn', detail }
  }
  if (!ok) failures++
  return { label, status: ok ? 'pass' : 'fail', detail }
}

function attr(html, tag, attrName, attrValue) {
  const re = new RegExp(
    `<${tag}\\s[^>]*${attrName}=["']${attrValue.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}["'][^>]*>`,
    'i',
  )
  return re.test(html)
}

function getContent(html, tag, attrName, attrValue) {
  const re = new RegExp(
    `<${tag}\\s[^>]*${attrName}=["']${attrValue}["'][^>]*content=["']([^"']*)["']`,
    'i',
  )
  const m = html.match(re)
  if (m) return m[1]
  const re2 = new RegExp(
    `<${tag}\\s[^>]*content=["']([^"']*)["'][^>]*${attrName}=["']${attrValue}["']`,
    'i',
  )
  return html.match(re2)?.[1]
}

function getTitle(html) {
  return html.match(/<title>([^<]*)<\/title>/i)?.[1]
}

function getCanonical(html) {
  return html.match(/<link\s[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1]
}

function getJsonLd(html) {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  return blocks.map((m) => {
    try {
      return JSON.parse(m[1])
    } catch {
      return { __invalid: true, raw: m[1] }
    }
  })
}

console.log('SEO validator — checking dist/\n')

for (const page of pages) {
  const filePath = join(DIST, page.file)
  let html
  try {
    html = await readFile(filePath, 'utf8')
  } catch {
    failures++
    results.push({ page: page.path, missing: true })
    console.log(`✗ ${page.path} — file missing: ${page.file}`)
    continue
  }

  const expectedUrl = `${SITE_URL}${page.path === '/' ? '' : page.path}`
  const title = getTitle(html)
  const desc = getContent(html, 'meta', 'name', 'description')
  const canonical = getCanonical(html)
  const ogTitle = getContent(html, 'meta', 'property', 'og:title')
  const ogDesc = getContent(html, 'meta', 'property', 'og:description')
  const ogUrl = getContent(html, 'meta', 'property', 'og:url')
  const ogImage = getContent(html, 'meta', 'property', 'og:image')
  const ogSite = getContent(html, 'meta', 'property', 'og:site_name')
  const ogLocale = getContent(html, 'meta', 'property', 'og:locale')
  const twCard = getContent(html, 'meta', 'name', 'twitter:card')
  const twSite = getContent(html, 'meta', 'name', 'twitter:site')
  const twImage = getContent(html, 'meta', 'name', 'twitter:image')
  const robots = getContent(html, 'meta', 'name', 'robots')
  const viewport = getContent(html, 'meta', 'name', 'viewport')
  const lang = html.match(/<html\s[^>]*lang=["']([^"']+)["']/i)?.[1]
  const ldBlocks = getJsonLd(html)
  const hasNoscript = /<noscript>[\s\S]+<\/noscript>/i.test(html)
  const hasKeywords = /<meta\s+name=["']keywords["']/i.test(html)

  const checks = [
    check('lang attribute on <html>', !!lang, lang ?? 'missing'),
    check('viewport meta', !!viewport, viewport ?? 'missing'),
    check('title present', !!title, title ?? ''),
    check(
      'title length 30–65 chars',
      title && title.length >= 30 && title.length <= 65,
      title ? `${title.length} chars` : 'no title',
    ),
    check('description present', !!desc),
    check(
      'description length 70–170 chars',
      desc && desc.length >= 70 && desc.length <= 170,
      desc ? `${desc.length} chars` : 'no description',
    ),
    check('canonical link', canonical === expectedUrl, canonical ?? 'missing'),
    check('og:title matches title', ogTitle === title),
    check('og:description matches description', ogDesc === desc),
    check('og:url matches canonical', ogUrl === expectedUrl, ogUrl ?? 'missing'),
    check('og:image present', !!ogImage),
    check('og:site_name present', !!ogSite),
    check('og:locale present', !!ogLocale),
    check('twitter:card = summary_large_image', twCard === 'summary_large_image'),
    check('twitter:site present', !!twSite),
    check('twitter:image present', !!twImage),
    check('robots meta present', !!robots, robots ?? 'missing'),
    check('JSON-LD blocks parse', ldBlocks.length > 0 && ldBlocks.every((b) => !b.__invalid), `${ldBlocks.length} blocks`),
    check('no <meta name="keywords"> (legacy)', !hasKeywords ? true : 'warn', hasKeywords ? 'found' : ''),
    check('noscript fallback (root only)', page.path === '/' ? hasNoscript : true),
  ]

  results.push({ page: page.path, checks })

  const failed = checks.filter((c) => c.status === 'fail')
  const warned = checks.filter((c) => c.status === 'warn')
  const status = failed.length === 0 ? (warned.length === 0 ? '✓' : '⚠') : '✗'
  console.log(`${status} ${page.path}  (${checks.length - failed.length - warned.length}/${checks.length} pass)`)
  for (const c of failed) console.log(`    ✗ ${c.label} — ${c.detail}`)
  for (const c of warned) console.log(`    ⚠ ${c.label} — ${c.detail}`)
}

// Sitemap & robots
console.log('\nSite-level checks:')
try {
  const sitemap = await readFile(join(DIST, 'sitemap.xml'), 'utf8')
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  const expected = pages.map((p) => `${SITE_URL}${p.path === '/' ? '' : p.path}`)
  const missing = expected.filter((u) => !urls.includes(u))
  if (missing.length === 0) {
    console.log(`  ✓ sitemap.xml — ${urls.length} URLs, all routes covered`)
  } else {
    failures++
    console.log(`  ✗ sitemap.xml missing URLs: ${missing.join(', ')}`)
  }
} catch {
  failures++
  console.log('  ✗ sitemap.xml not found')
}

try {
  const robots = await readFile(join(DIST, 'robots.txt'), 'utf8')
  if (/Sitemap:\s*https?:\/\//i.test(robots)) {
    console.log('  ✓ robots.txt references sitemap')
  } else {
    failures++
    console.log('  ✗ robots.txt missing Sitemap directive')
  }
} catch {
  failures++
  console.log('  ✗ robots.txt not found')
}

console.log('')
console.log(`Summary: ${failures} failure${failures === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}, ${pages.length} pages checked`)

process.exit(failures > 0 ? 1 : 0)
