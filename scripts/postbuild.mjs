// Generate per-route HTML, sitemap.xml, and route-specific JSON-LD
// from a single built dist/index.html. The React app still hydrates
// client-side; this script only patches the static HTML that crawlers
// (and social previews) read first.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DIST = join(ROOT, 'dist')

const seo = JSON.parse(await readFile(join(ROOT, 'src/data/seo.json'), 'utf8'))
const slides = JSON.parse(await readFile(join(ROOT, 'src/data/slides.json'), 'utf8'))

const SITE = seo.site

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const canonical = (path) => `${SITE.url}${path === '/' ? '' : path}`

function flowSeo(slug) {
  const slide = slides.find((s) => s.slug === slug)
  if (!slide) return null
  const override = seo.flows[slug]
  return {
    title: override?.title ?? `${slide.title} — OAuth Flow Visualized | ${SITE.name}`,
    description: override?.description ?? slide.description,
    path: `/flows/${slug}`,
    type: 'article',
    image: `${SITE.url}/og/flows/${slug}.png`,
    slide,
  }
}

function buildMetaBlock(page, jsonLd) {
  const url = canonical(page.path)
  const title = escapeHtml(page.title)
  const desc = escapeHtml(page.description)
  const ogType = page.type ?? 'website'
  const ogImage = page.image ?? SITE.image
  const ldScripts = (Array.isArray(jsonLd) ? jsonLd : [jsonLd])
    .map((ld) => `<script type="application/ld+json">${JSON.stringify(ld)}</script>`)
    .join('\n    ')

  return `<title>${title}</title>
    <meta name="title" content="${title}" />
    <meta name="description" content="${desc}" />
    <meta name="author" content="Sohail Pathan" />
    <meta name="robots" content="index,follow,max-image-preview:large" />
    <link rel="canonical" href="${url}" />

    <meta property="og:type" content="${ogType}" />
    <meta property="og:site_name" content="${SITE.name}" />
    <meta property="og:locale" content="${SITE.locale}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${desc}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${SITE.name} — interactive OAuth 2.0 and OIDC flow visualizations" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="${SITE.twitter}" />
    <meta name="twitter:url" content="${url}" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${desc}" />
    <meta name="twitter:image" content="${ogImage}" />

    ${ldScripts}`
}

function patchHtml(shell, page, jsonLd) {
  const metaBlock = buildMetaBlock(page, jsonLd)
  // Replace everything between <!-- Primary Meta Tags --> and the favicon block
  // by anchoring on the existing <title> tag in the shell.
  return shell.replace(
    /<title>[\s\S]*?<\/script>\s*\n\s*<!-- Favicon -->/,
    `${metaBlock}\n\n    <!-- Favicon -->`,
  )
}

async function writeRoute(html, path) {
  const out = path === '/' ? join(DIST, 'index.html') : join(DIST, path.replace(/^\//, ''), 'index.html')
  await mkdir(dirname(out), { recursive: true })
  await writeFile(out, html, 'utf8')
}

const shell = await readFile(join(DIST, 'index.html'), 'utf8')

// Sanity check: the regex anchor must match
if (!/<title>[\s\S]*?<\/script>\s*\n\s*<!-- Favicon -->/.test(shell)) {
  console.error('postbuild: cannot locate meta block in dist/index.html — aborting')
  process.exit(1)
}

const homeJsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    description: seo.home.description,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'OAuth 2.0 and OIDC flow visualizations',
    itemListElement: slides.map((slide, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: canonical(`/flows/${slide.slug}`),
      name: slide.title,
    })),
  },
]

await writeRoute(patchHtml(shell, { ...seo.home, type: 'website' }, homeJsonLd), '/')
console.log('  ✓ /')

const playgroundJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'OAuth Playground',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Web',
  url: canonical(seo.playground.path),
  description: seo.playground.description,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  isPartOf: { '@type': 'WebSite', name: SITE.name, url: SITE.url },
}

await writeRoute(patchHtml(shell, { ...seo.playground, type: 'website' }, playgroundJsonLd), '/playground')
console.log('  ✓ /playground')

for (const slide of slides) {
  const page = flowSeo(slide.slug)
  if (!page) continue
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: page.title,
      description: page.description,
      url: canonical(page.path),
      mainEntityOfPage: canonical(page.path),
      inLanguage: 'en',
      isPartOf: { '@type': 'WebSite', name: SITE.name, url: SITE.url },
      about: slide.title,
      articleSection: slide.category,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
        { '@type': 'ListItem', position: 2, name: 'Flows', item: `${SITE.url}/flows/${slide.slug}` },
        { '@type': 'ListItem', position: 3, name: slide.title, item: canonical(page.path) },
      ],
    },
  ]
  await writeRoute(patchHtml(shell, page, jsonLd), page.path)
  console.log(`  ✓ ${page.path}`)
}

const today = new Date().toISOString().slice(0, 10)
const sitemapEntries = [
  { loc: canonical('/'), priority: '1.0', changefreq: 'weekly' },
  { loc: canonical('/playground'), priority: '0.9', changefreq: 'monthly' },
  ...slides.map((s) => ({
    loc: canonical(`/flows/${s.slug}`),
    priority: '0.8',
    changefreq: 'monthly',
  })),
]

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries
  .map(
    (e) =>
      `  <url>\n    <loc>${e.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`,
  )
  .join('\n')}
</urlset>
`

await writeFile(join(DIST, 'sitemap.xml'), sitemap, 'utf8')
console.log(`  ✓ sitemap.xml (${sitemapEntries.length} urls)`)

console.log('\npostbuild: done')
