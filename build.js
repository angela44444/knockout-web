/**
 * Knockout web — Squarespace build
 *
 * 1. Vite bundles src/ → dist-vite/knockout-app.js + CSS
 * 2. Scopes CSS under .ko-app, writes dist/ for Squarespace upload
 */

'use strict'

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import postcss from 'postcss'
import CleanCSS from 'clean-css'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC = __dirname
const DIST_VITE = path.join(SRC, 'dist-vite')
const DIST = path.join(SRC, 'dist')
const SCOPE = '.ko-app'
const YEAR = new Date().getFullYear()

const BANNER =
  `/*! Knockout Web — (c) ${YEAR} zelgraz.com — AGPL-3.0\n` +
  ` * Source: https://github.com/angela44444/knockout-web */\n`

const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Syne:wght@600;700;800&display=swap" rel="stylesheet">'

function runVite() {
  console.log('Running Vite build...')
  execSync('npx vite build', { cwd: SRC, stdio: 'inherit' })
}

function scopeCss(rawCss) {
  const root = postcss.parse(rawCss)

  root.walkRules((rule) => {
    if (rule.parent && rule.parent.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) {
      return
    }
    rule.selectors = rule.selectors.map((sel) => {
      const s = sel.trim()
      if (/^(:root|html|body)$/i.test(s)) return SCOPE
      if (/^(html|body)[\s>:.[]/i.test(s)) return s.replace(/^(html|body)/i, SCOPE)
      return `${SCOPE} ${s}`
    })
  })

  const overrides = `
${SCOPE} { position: relative; overflow: hidden; min-height: auto; background: var(--mist, #e6efe9); }
${SCOPE} .atmosphere { position: absolute; inset: 0; }
${SCOPE} .page { min-height: 0; }
${SCOPE} #ko-root { min-height: 0; }
`

  const scoped = root.toString() + overrides
  const minified = new CleanCSS({ level: 1 }).minify(scoped)
  if (minified.errors.length) {
    throw new Error('CSS minify failed: ' + minified.errors.join(', '))
  }
  return minified.styles
}

function findCssFile() {
  const direct = path.join(DIST_VITE, 'knockout-style-raw.css')
  if (fs.existsSync(direct)) return direct
  const assets = path.join(DIST_VITE, 'assets')
  if (fs.existsSync(assets)) {
    const css = fs.readdirSync(assets).find((f) => f.endsWith('.css'))
    if (css) return path.join(assets, css)
  }
  throw new Error('Could not find built CSS in dist-vite/')
}

function buildCss() {
  const raw = fs.readFileSync(findCssFile(), 'utf8')
  const scoped = scopeCss(raw)
  fs.writeFileSync(path.join(DIST, 'knockout-style.css'), BANNER + scoped)
  console.log('  knockout-style.css  ' + scoped.length + ' bytes')
}

function buildJs() {
  const jsPath = path.join(DIST_VITE, 'knockout-app.js')
  if (!fs.existsSync(jsPath)) throw new Error('Missing dist-vite/knockout-app.js')
  const js = fs.readFileSync(jsPath, 'utf8')
  fs.writeFileSync(path.join(DIST, 'knockout-app.js'), BANNER + js)
  console.log('  knockout-app.js     ' + js.length + ' bytes')
}

function extractEmbedBody() {
  return '<div id="ko-root"></div>'
}

function buildHtml() {
  const body = extractEmbedBody()

  const embed = `<!-- ============================================================
  Knockout — Squarespace Code Block embed
  Licensed under AGPL-3.0 — https://github.com/angela44444/knockout-web

  BEFORE PASTING: upload dist/knockout-style.css and dist/knockout-app.js
  to Squarespace (Link editor > File) and replace the two /s/ URLs
  below if Squarespace gave them different names.
============================================================= -->
${FONTS}
<link rel="stylesheet" href="/s/knockout-style.css">

<div class="ko-app">
${body}
</div>

<script src="/s/knockout-app.js" defer></script>
`
  fs.writeFileSync(path.join(DIST, 'embed.html'), embed)
  console.log('  embed.html          Code Block fragment')

  const testPage = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Knockout — local test of Squarespace build</title>
${FONTS}
<link rel="stylesheet" href="knockout-style.css">
<style>body { margin: 0; background: #e6efe9; }</style>
</head>
<body>
<div class="ko-app">
${body}
</div>
<script src="knockout-app.js" defer></script>
</body>
</html>
`
  fs.writeFileSync(path.join(DIST, 'test-local.html'), testPage)
  console.log('  test-local.html     serve with "npm run preview"')
}

fs.rmSync(DIST, { recursive: true, force: true })
fs.mkdirSync(DIST, { recursive: true })

console.log('Building dist/ for Squarespace...')
runVite()
buildCss()
buildJs()
buildHtml()
console.log('Done.')
