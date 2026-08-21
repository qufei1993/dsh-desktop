import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const prefix = process.argv[process.argv.indexOf('--dir') + 1]
const rootManifest = JSON.parse(await readFile(path.join(prefix, 'package.json'), 'utf8'))
const version = rootManifest.dependencies?.['@deepseek-ai/dsh']
const environmentIsSafe = process.env.pnpm_config_dangerously_allow_all_builds === 'true'
  && process.env.pnpm_config_minimum_release_age === '0'
  && process.env.pnpm_config_strict_dep_builds === 'true'
if (!prefix || !version || !process.argv.includes('--prefer-offline') || !environmentIsSafe || process.env.FAKE_PNPM_FAIL === '1') process.exit(2)
if (version === '9.9.9') await new Promise(() => { setInterval(() => undefined, 1_000) })
process.stdout.write('Progress: resolved 12, reused 8, downloaded 3, added 1\n')
const packageRoot = path.join(prefix, 'node_modules', '@deepseek-ai', 'dsh')
await mkdir(packageRoot, { recursive: true })
await writeFile(path.join(packageRoot, 'package.json'), JSON.stringify({ name: '@deepseek-ai/dsh', version, bin: { dsh: 'cli.js' } }))
await writeFile(path.join(packageRoot, 'cli.js'), 'console.log("fake")')
