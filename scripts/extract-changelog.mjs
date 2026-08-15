import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function normalizeVersion(input) {
  const version = String(input || '').trim()
  return version.startsWith('v') ? version.slice(1) : version
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function extractChangelogSection(changelogText, tagOrVersion) {
  const version = normalizeVersion(tagOrVersion)
  if (!version) return null
  const escaped = escapeRegExp(version)
  const header = new RegExp(`^##\\s+(?:\\[v?${escaped}\\]|v?${escaped})(?:\\s*-\\s*.*)?$`)
  const lines = changelogText.split(/\r?\n/)
  const headingIndex = lines.findIndex((line) => header.test(line.trimEnd()))
  if (headingIndex < 0) return null
  const nextHeading = lines.findIndex((line, index) => index > headingIndex && /^##\s+/.test(line))
  const body = lines.slice(headingIndex + 1, nextHeading < 0 ? lines.length : nextHeading).join('\n').trim()
  return body || null
}

function listVersions(changelogText) {
  return [...new Set([...changelogText.matchAll(/^##\s+(?:\[)?(?<version>v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)(?:\])?(?:\s*-.*)?$/gm)].map((match) => match.groups?.version).filter(Boolean))]
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
if (isMain) {
  const [tagOrVersion, changelogPath = 'CHANGELOG.md'] = process.argv.slice(2)
  if (!tagOrVersion) {
    console.error('用法：node scripts/extract-changelog.mjs <tag-or-version> [CHANGELOG.md]')
    process.exit(2)
  }
  if (!fs.existsSync(changelogPath)) {
    console.error(`找不到 Changelog：${changelogPath}`)
    process.exit(2)
  }
  const changelogText = fs.readFileSync(changelogPath, 'utf8')
  const section = extractChangelogSection(changelogText, tagOrVersion)
  if (!section) {
    console.error(`CHANGELOG.md 中没有 ${normalizeVersion(tagOrVersion)} 对应的版本章节`)
    const available = listVersions(changelogText)
    if (available.length) console.error(`已有版本：${available.join(', ')}`)
    process.exit(3)
  }
  process.stdout.write(`${section}\n`)
}
