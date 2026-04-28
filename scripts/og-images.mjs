// Generate per-flow OG images (1200x630 PNG) at build time.
// Each flow page references /og/flows/<slug>.png as its og:image.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DIST = join(ROOT, 'dist')

const slides = JSON.parse(await readFile(join(ROOT, 'src/data/slides.json'), 'utf8'))
const seo = JSON.parse(await readFile(join(ROOT, 'src/data/seo.json'), 'utf8'))

const CATEGORY_ACCENT = {
  Foundations: '#60a5fa',
  'Core Flows': '#10b981',
  Deprecated: '#f87171',
  'AI Agent Patterns': '#a78bfa',
}

const escapeXml = (s) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

function wrap(text, maxChars) {
  const words = text.split(/\s+/)
  const lines = []
  let line = ''
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars) {
      if (line) lines.push(line)
      line = w
    } else {
      line = (line + ' ' + w).trim()
    }
  }
  if (line) lines.push(line)
  return lines
}

function svgFor(slide) {
  const accent = CATEGORY_ACCENT[slide.category] ?? '#10b981'
  const titleLines = wrap(slide.title, 28).slice(0, 2)
  const descLines = wrap(seo.flows[slide.slug]?.description ?? slide.description, 60).slice(0, 3)

  const titleY = 230
  const lineHeight = 80
  const descStartY = titleY + titleLines.length * lineHeight + 60

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a0a0a"/>
      <stop offset="1" stop-color="#171717"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.15"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#accent)"/>
  <rect x="0" y="0" width="6" height="630" fill="${accent}"/>

  <!-- Brand row -->
  <text x="80" y="105" font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="28" fill="${accent}">oauthflows</text>
  <text x="80" y="140" font-family="Inter, system-ui, sans-serif" font-weight="500" font-size="20" fill="#a3a3a3" letter-spacing="2">${escapeXml((slide.category ?? 'OAuth').toUpperCase())}</text>

  <!-- Title -->
  ${titleLines
    .map(
      (line, i) =>
        `<text x="80" y="${titleY + i * lineHeight}" font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="68" fill="#f5f5f5">${escapeXml(line)}</text>`,
    )
    .join('\n  ')}

  <!-- Description -->
  ${descLines
    .map(
      (line, i) =>
        `<text x="80" y="${descStartY + i * 38}" font-family="Inter, system-ui, sans-serif" font-weight="400" font-size="26" fill="#d4d4d4">${escapeXml(line)}</text>`,
    )
    .join('\n  ')}

  <!-- Footer -->
  <line x1="80" y1="555" x2="1120" y2="555" stroke="#262626" stroke-width="1"/>
  <text x="80" y="595" font-family="Inter, system-ui, sans-serif" font-weight="500" font-size="22" fill="#737373">Interactive OAuth 2.0 &amp; OIDC flow visualization</text>
  <text x="1120" y="595" text-anchor="end" font-family="Inter, system-ui, sans-serif" font-weight="500" font-size="22" fill="${accent}">oauthflows.com</text>
</svg>`
}

const outDir = join(DIST, 'og', 'flows')
await mkdir(outDir, { recursive: true })

for (const slide of slides) {
  const svg = svgFor(slide)
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng()
  await writeFile(join(outDir, `${slide.slug}.png`), png)
  console.log(`  ✓ /og/flows/${slide.slug}.png`)
}

console.log(`\nog-images: ${slides.length} cards generated`)
