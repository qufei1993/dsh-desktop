import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { StateStore } from '../src/main/state-store'

let directory = ''
afterEach(async () => { if (directory) await rm(directory, { recursive: true, force: true }) })

describe('StateStore', () => {
  it('首次读取返回默认值并以原子文件保存', async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), 'dsh-state-'))
    const store = new StateStore(directory)
    expect(await store.read()).toEqual({ schemaVersion: 1, selectedVersion: null, dismissedLatest: null, localePreference: 'system' })
    await store.write({ schemaVersion: 1, selectedVersion: '0.1.0-rc.6', dismissedLatest: null, localePreference: 'en-US' })
    expect(JSON.parse(await readFile(store.file, 'utf8'))).toMatchObject({ selectedVersion: '0.1.0-rc.6', localePreference: 'en-US' })
  })

  it('兼容没有语言字段的旧状态文件', async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), 'dsh-state-'))
    const store = new StateStore(directory)
    await store.write({ schemaVersion: 1, selectedVersion: null, dismissedLatest: null, localePreference: 'system' })
    const legacy = JSON.parse(await readFile(store.file, 'utf8'))
    delete legacy.localePreference
    await writeFile(store.file, JSON.stringify(legacy))
    expect((await store.read()).localePreference).toBe('system')
  })
})
