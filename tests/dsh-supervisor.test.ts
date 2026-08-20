import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { DshSupervisor, dshWebArguments, parseLoopbackUrl, prependRuntimePath } from '../src/main/dsh-supervisor'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let supervisor: DshSupervisor | null = null
afterEach(async () => { await supervisor?.stop() })

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

  it('启动假 CLI、进入运行状态并正常停止', async () => {
    supervisor = new DshSupervisor(process.execPath)
    const url = await supervisor.start({ version: '1.0.0', root, entry: path.join(root, 'tests/fixtures/fake-dsh.mjs'), source: 'installed' }, 5_000)
    expect(url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/)
    expect(supervisor.status).toBe('running')
    await supervisor.stop()
    expect(supervisor.status).toBe('idle')
  })
})
