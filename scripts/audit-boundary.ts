import { access, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = path.join(root, 'src')

async function files(directory: string): Promise<string[]> {
  const result: string[] = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) result.push(...await files(target))
    else if (/\.(ts|tsx)$/.test(entry.name)) result.push(target)
  }
  return result
}

const violations: string[] = []
for (const file of await files(sourceRoot)) {
  const content = await readFile(file, 'utf8')
  if (content.includes('DSH_HOME')) violations.push(`${file}: production source must not override DSH_HOME`)
  if (/from\s+['"]@deepseek-ai\/dsh/.test(content)) violations.push(`${file}: must not import official private APIs`)
  if (/nodeIntegration:\s*true/.test(content)) violations.push(`${file}: Node integration must stay disabled`)
  if (/shell:\s*true/.test(content)) violations.push(`${file}: child processes must not use a shell`)
}
if (violations.length) throw new Error(violations.join('\n'))
const preload = path.join(root, 'out', 'preload', 'index.cjs')
await access(preload)
const rendererHtml = await readFile(path.join(root, 'out', 'renderer', 'index.html'), 'utf8')
if (!rendererHtml.includes('./assets/')) throw new Error('renderer production assets must use relative paths')
console.log('Boundary audit passed: production boundaries, CommonJS preload, and relative renderer assets are valid')
