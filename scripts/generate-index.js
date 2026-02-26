'use strict'

const fs = require('fs')
const path = require('path')

// Read all subdirectories of ./templates/ only — never the repo root.
// This prevents index.json from creating a self-referential entry (Pitfall 5).
const templatesDir = path.join(__dirname, '..', 'templates')

const dirs = fs.readdirSync(templatesDir, { withFileTypes: true })
  .filter(d => d.isDirectory())

const BASE_URL = 'https://hoople-templates.pages.dev'

const templates = dirs.map(d => {
  const manifestPath = path.join(templatesDir, d.name, 'manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  return {
    ...manifest,
    id: d.name,
    previewUrl: `${BASE_URL}/templates/${d.name}/preview.png`,
    controllerUrl: `${BASE_URL}/templates/${d.name}/controller.html`,
  }
})

const index = {
  generated: new Date().toISOString(),
  templates,
}

const outDir = path.join(__dirname, '..')

// Write index.json
fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index, null, 2))
console.log(`Generated index.json with ${templates.length} templates`)

// Write sitemap.xml
const sitemapEntries = [
  `  <url>
    <loc>${BASE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`
]

templates.forEach(tpl => {
  sitemapEntries.push(`  <url>
    <loc>${BASE_URL}/t/${tpl.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`)
})

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.join('\n')}
</urlset>
`

fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap)
console.log(`Generated sitemap.xml with ${templates.length + 1} URLs`)
