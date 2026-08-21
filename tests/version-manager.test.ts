import { mkdir, mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises'
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
      npmCli: path.join(root, 'tests/fixtures/fake-npm.mjs'),
      pnpmCli: path.join(root, 'tests/fixtures/fake-pnpm.mjs'),
      commandDir: path.join(root, 'node_modules/.bin')
    })
    const progress: string[] = []
    await manager.install('1.2.3-rc.1', ['1.2.3-rc.1'], (value) => progress.push(value.message))
    const resolved = await manager.resolve('1.2.3-rc.1')
    expect(resolved.version).toBe('1.2.3-rc.1')
    expect(resolved.entry).toContain(path.join('@deepseek-ai', 'dsh', 'cli.js'))
    expect(progress).toContain('正在获取依赖：已解析 12，已复用 8，已下载 3，已安装 1')
    await expect(manager.install('../escape', ['../escape'], () => undefined)).rejects.toThrow()
  })

  it('启动时清理中断安装留下的临时目录', async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), 'dsh-version-'))
    const staging = path.join(directory, 'dsh-versions', '.install-1.2.3-123')
    await mkdir(staging, { recursive: true })
    await writeFile(path.join(staging, 'partial'), 'partial')
    const manager = new VersionManager(directory, path.join(directory, 'bundled'), {
      node: process.execPath,
      npmCli: path.join(root, 'tests/fixtures/fake-npm.mjs'),
      pnpmCli: path.join(root, 'tests/fixtures/fake-pnpm.mjs'),
      commandDir: path.join(root, 'node_modules/.bin')
    })
    await manager.cleanupInterruptedInstalls()
    await expect(manager.list()).resolves.toEqual([])
    await expect(stat(staging)).rejects.toThrow()
  })

  it('安装长时间无输出时终止子进程并清理临时目录', async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), 'dsh-version-'))
    const manager = new VersionManager(directory, path.join(directory, 'bundled'), {
      node: process.execPath,
      npmCli: path.join(root, 'tests/fixtures/fake-npm.mjs'),
      pnpmCli: path.join(root, 'tests/fixtures/fake-pnpm.mjs'),
      commandDir: path.join(root, 'node_modules/.bin')
    }, null, 50)
    await expect(manager.install('9.9.9', ['9.9.9'], () => undefined)).rejects.toThrow('无进展')
    const names = await readdir(path.join(directory, 'dsh-versions'))
    expect(names.some((name) => name.startsWith('.install-'))).toBe(false)
  })
})
