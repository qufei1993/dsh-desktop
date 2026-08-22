import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { DshSupervisor, dshCommandDirectory, dshRuntimeEnvironment, dshWebArguments, parseLoopbackUrl, prependRuntimePath } from '../src/main/dsh-supervisor'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let supervisor: DshSupervisor | null = null
let directory = ''
afterEach(async () => {
  await supervisor?.stop()
  delete process.env.DSH_DESKTOP_TEST_REQUIRE_DSH_CLI
  if (directory) await rm(directory, { recursive: true, force: true })
})

describe('parseLoopbackUrl', () => {
  it('只接受带端口的 127.0.0.1 HTTP 地址', () => {
    expect(parseLoopbackUrl('dsh web: http://127.0.0.1:50141')).toBe('http://127.0.0.1:50141')
    expect(parseLoopbackUrl('http://localhost:3000')).toBeNull()
    expect(parseLoopbackUrl('https://127.0.0.1:3000')).toBeNull()
    expect(parseLoopbackUrl('http://example.com:3000')).toBeNull()
  })
})

describe('DshSupervisor', () => {
  it('仅对支持的 DSH 版本禁止打开系统浏览器', () => {
    const entry = '/runtime/dsh.js'
    expect(dshWebArguments({ version: '0.1.0-rc.6', root, entry, source: 'installed' })).toEqual([entry, 'web', '--port', '0'])
    expect(dshWebArguments({ version: '0.1.0-rc.8', root, entry, source: 'installed' })).toEqual([entry, 'web', '--no-open', '--port', '0'])
    expect(dshWebArguments({ version: '0.1.0', root, entry, source: 'installed' })).toEqual([entry, 'web', '--no-open', '--port', '0'])
  })

  it('把应用私有命令目录放到 PATH 前面并去重', () => {
    expect(prependRuntimePath({ Path: 'C:\\Windows;C:\\Tools', PATH: 'ignored' }, ['C:\\Runtime', 'c:\\tools'], 'win32')).toEqual({
      Path: 'C:\\Runtime;c:\\tools;C:\\Windows'
    })
    expect(prependRuntimePath({ PATH: '/usr/bin:/bin' }, ['/app/bin', '/usr/bin'], 'darwin').PATH).toBe('/app/bin:/usr/bin:/bin')
  })

  it('只为 DSH 子进程关闭 pnpm 的致命构建脚本检查', () => {
    expect(dshRuntimeEnvironment({ PATH: '/usr/bin' }, ['/app/bin'], 'darwin')).toMatchObject({
      PATH: '/app/bin:/usr/bin',
      pnpm_config_strict_dep_builds: 'false'
    })
  })

  it('把当前 DSH 版本的命令目录放到 PATH 最前面', () => {
    const dsh = { version: '1.0.0', root: '/managed/1.0.0', entry: '/managed/1.0.0/dsh.js', source: 'installed' as const }
    expect(dshCommandDirectory(dsh)).toBe(path.join('/managed/1.0.0', 'node_modules', '.bin'))
  })

  it('启动假 CLI、进入运行状态并正常停止', async () => {
    supervisor = new DshSupervisor(process.execPath)
    const url = await supervisor.start({ version: '1.0.0', root, entry: path.join(root, 'tests/fixtures/fake-dsh.mjs'), source: 'installed' }, 5_000)
    expect(url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/)
    expect(supervisor.status).toBe('running')
    await supervisor.stop()
    expect(supervisor.status).toBe('idle')
  })

  it('让 DSH 内部的插件管理器能按名称调用当前版本 CLI', async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), 'dsh-supervisor-'))
    const commandDirectory = path.join(directory, 'node_modules', '.bin')
    await mkdir(commandDirectory, { recursive: true })
    if (process.platform === 'win32') {
      await writeFile(path.join(commandDirectory, 'dsh.cmd'), '@echo 1.0.0\r\n')
    } else {
      const command = path.join(commandDirectory, 'dsh')
      await writeFile(command, '#!/bin/sh\necho 1.0.0\n')
      await chmod(command, 0o755)
    }
    process.env.DSH_DESKTOP_TEST_REQUIRE_DSH_CLI = '1'
    supervisor = new DshSupervisor(process.execPath)
    const url = await supervisor.start({
      version: '1.0.0', root: directory, entry: path.join(root, 'tests/fixtures/fake-dsh.mjs'), source: 'installed'
    }, 5_000)
    expect(url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/)
  })
})
