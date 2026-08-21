import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { AppController } from '../src/main/controller'
import { DshSupervisor } from '../src/main/dsh-supervisor'
import { DshRegistry } from '../src/main/registry'
import { StateStore } from '../src/main/state-store'
import { VersionManager } from '../src/main/version-manager'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let directory = ''
afterEach(async () => { if (directory) await rm(directory, { recursive: true, force: true }) })

describe('AppController', () => {
  it('提示并安装新版本但保持当前选择，用户确认后才切换', async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), 'dsh-controller-'))
    const runtime = {
      node: process.execPath,
      npmCli: path.join(root, 'tests/fixtures/fake-npm.mjs'),
      pnpmCli: path.join(root, 'tests/fixtures/fake-pnpm.mjs'),
      commandDir: path.dirname(process.execPath)
    }
    const versions = new VersionManager(directory, path.join(directory, 'bundled'), runtime)
    await versions.install('1.0.0', ['1.0.0'], () => undefined)
    const fetcher = async () => new Response(JSON.stringify({
      versions: { '1.0.0': {}, '1.1.0': {} }, 'dist-tags': { latest: '1.1.0' }
    }), { status: 200 })
    const controller = new AppController('0.1.0', new StateStore(directory), new DshRegistry(fetcher as typeof fetch), versions, new DshSupervisor(process.execPath), runtime)
    expect((await controller.initialize()).selectedVersion).toBe('1.0.0')
    const refreshed = await controller.refresh()
    expect(refreshed.latestVersion).toBe('1.1.0')
    expect(refreshed.selectedVersion).toBe('1.0.0')
    expect(refreshed.availableVersions.map((item) => item.version)).toEqual(['1.1.0', '1.0.0'])
    expect((await controller.dismissUpdate('1.1.0')).dismissedLatest).toBe('1.1.0')
    expect((await controller.install('1.1.0')).selectedVersion).toBe('1.0.0')
    expect((await controller.select('1.1.0')).selectedVersion).toBe('1.1.0')
    expect((await controller.setLocale('en-US'))).toMatchObject({ locale: 'en-US', localePreference: 'en-US' })
  })
})
