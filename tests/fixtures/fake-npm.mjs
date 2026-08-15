import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const prefix = process.argv[process.argv.indexOf('--prefix') + 1]
const rootManifest = JSON.parse(await readFile(path.join(prefix, 'package.json'), 'utf8'))
const version = rootManifest.dependencies?.['@deepseek-ai/dsh']
if (!prefix || !version || process.env.FAKE_NPM_FAIL === '1') process.exit(2)
const packageRoot = path.join(prefix, 'node_modules', '@deepseek-ai', 'dsh')
await mkdir(packageRoot, { recursive: true })
await writeFile(path.join(packageRoot, 'package.json'), JSON.stringify({ name: '@deepseek-ai/dsh', version, bin: { dsh: 'cli.js' } }))
await writeFile(path.join(packageRoot, 'cli.js'), 'console.log("fake")')
