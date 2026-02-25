'use strict'

const fs = require('fs')
const path = require('path')

// Read all subdirectories of ./templates/ only — never the repo root.
// This prevents index.json from creating a self-referential entry (Pitfall 5).
const templatesDir = path.join(__dirname, '..', 'templates')

const dirs = fs.readdirSync(templatesDir, { withFileTypes: true })
  .filter(d => d.isDirectory())

const templates = dirs.map(d => {
  const manifestPath = path.join(templatesDir, d.name, 'manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  return {
    ...manifest,
    id: d.name,
    previewUrl: `https://templates.hoople.app/templates/${d.name}/preview.png`,
    controllerUrl: `https://templates.hoople.app/templates/${d.name}/controller.html`,
  }
})

const index = {
  generated: new Date().toISOString(),
  templates,
}

fs.writeFileSync(path.join(__dirname, '..', 'index.json'), JSON.stringify(index, null, 2))
console.log(`Generated index.json with ${templates.length} templates`)
