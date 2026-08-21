import { spawnSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const prefix = process.argv[process.argv.indexOf('--dir') + 1]
const rootManifest = JSON.parse(await readFile(path.join(prefix, 'package.json'), 'utf8'))
const buildPolicy = await readFile(path.join(prefix, 'pnpm-workspace.yaml'), 'utf8')
const version = rootManifest.dependencies?.['@deepseek-ai/dsh']
const environmentIsSafe = process.env.pnpm_config_dangerously_allow_all_builds === undefined
  && process.env.pnpm_config_minimum_release_age === '0'
  && process.env.pnpm_config_strict_dep_builds === 'false'
  && buildPolicy.includes("'@deepseek-ai/dsh-subprocess-local': true")
  && buildPolicy.includes('koffi: false')
  && buildPolicy.includes('node-pty: false')
const lifecycleNode = spawnSync('node', ['--version'], { encoding: 'utf8', env: process.env, shell: false, windowsHide: true })
const pathKey = Object.keys(process.env).find((key) => key.toLowerCase() === 'path') ?? 'PATH'
const pathEntries = process.env[pathKey]?.split(path.delimiter) ?? []
const bundledNodeIsFirst = pathEntries[0]?.toLowerCase() === path.dirname(process.execPath).toLowerCase()
if (!prefix || !version || !process.argv.includes('--prefer-offline') || !environmentIsSafe || lifecycleNode.status !== 0 || !bundledNodeIsFirst) process.exit(2)
if (process.env.FAKE_PNPM_FAIL === '1') {
  process.stderr.write('fixture lifecycle: sh: node: command not found\n[ELIFECYCLE] Command failed.\n')
  process.exit(2)
}
if (version === '9.9.9') await new Promise(() => { setInterval(() => undefined, 1_000) })
process.stdout.write('Progress: resolved 12, reused 8, downloaded 3, added 1\n')
const packageRoot = path.join(prefix, 'node_modules', '@deepseek-ai', 'dsh')
await mkdir(packageRoot, { recursive: true })
await writeFile(path.join(packageRoot, 'package.json'), JSON.stringify({ name: '@deepseek-ai/dsh', version, bin: { dsh: 'cli.js' } }))
await writeFile(path.join(packageRoot, 'cli.js'), 'console.log("fake")')
