import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { VersionManager } from '../src/main/version-manager'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let directory = ''
afterEach(async () => { if (directory) await rm(directory, { recursive: true, force: true }) })

describe('VersionManager', () => {
  it('只安装目录中声明的精确官方版本并能解析入口', async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), 'dsh-version-'))
    const manager = new VersionManager(directory, path.join(directory, 'bundled'), {
      node: process.execPath,
      npmCli: path.join(root, 'tests/fixtures/fake-npm.mjs')
    })
    await manager.install('1.2.3-rc.1', ['1.2.3-rc.1'], () => undefined)
    const resolved = await manager.resolve('1.2.3-rc.1')
    expect(resolved.version).toBe('1.2.3-rc.1')
    expect(resolved.entry).toContain(path.join('@deepseek-ai', 'dsh', 'cli.js'))
    await expect(manager.install('../escape', ['../escape'], () => undefined)).rejects.toThrow()
  })
})
