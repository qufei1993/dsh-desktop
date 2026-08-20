import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { dshRuntimeEnvironment } from '../src/main/dsh-supervisor'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pnpmCli = process.env.DSH_DESKTOP_TEST_PNPM_CLI ?? path.join(root, 'node_modules', 'pnpm', 'bin', 'pnpm.mjs')
let directory = ''

afterEach(async () => {
  if (directory) await rm(directory, { recursive: true, force: true })
})

function pnpm(cwd: string, args: string[], environment: NodeJS.ProcessEnv = {}) {
  return spawnSync(process.execPath, [pnpmCli, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...environment, CI: '1' },
    shell: false,
    windowsHide: true
  })
}

function pack(fixture: string, destination: string): string {
  const result = pnpm(path.join(root, 'tests', 'fixtures', fixture), ['pack', '--pack-destination', destination])
  expect(result.status, result.stderr).toBe(0)
  const archive = result.stdout.trim().split(/\r?\n/).at(-1)!
  return path.isAbsolute(archive) ? archive : path.join(destination, archive)
}

describe('bundled pnpm compatibility', () => {
  it('阻止未授权构建脚本时仍允许后续插件安装', async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), 'dsh-pnpm-compat-'))
    await writeFile(path.join(directory, 'package.json'), JSON.stringify({ name: 'dsh-profile', private: true }))
    const needsBuild = pack('pnpm-needs-build', directory)
    const plainPlugin = pack('pnpm-plain-plugin', directory)

    const first = pnpm(directory, ['add', needsBuild, '--reporter=append-only'])
    expect(first.status, `${first.stdout}\n${first.stderr}`).toBe(1)
    expect(`${first.stdout}\n${first.stderr}`).toContain('ERR_PNPM_IGNORED_BUILDS')
    expect(`${first.stdout}\n${first.stderr}`).toContain('Ignored build scripts')
    await expect(readFile(path.join(directory, 'node_modules', 'dsh-desktop-test-needs-build', 'built.txt'), 'utf8')).rejects.toThrow()

    const update = pnpm(directory, ['add', plainPlugin, '--reporter=append-only'], dshRuntimeEnvironment(process.env, []))
    expect(update.status, `${update.stdout}\n${update.stderr}`).toBe(0)
    await expect(readFile(path.join(directory, 'node_modules', 'dsh-desktop-test-needs-build', 'built.txt'), 'utf8')).rejects.toThrow()
  }, 30_000)
})
