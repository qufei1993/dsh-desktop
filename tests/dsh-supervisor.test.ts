import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { DshSupervisor, parseLoopbackUrl } from '../src/main/dsh-supervisor'

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
  it('启动假 CLI、进入运行状态并正常停止', async () => {
    supervisor = new DshSupervisor(process.execPath)
    const url = await supervisor.start({ version: '1.0.0', root, entry: path.join(root, 'tests/fixtures/fake-dsh.mjs'), source: 'installed' }, 5_000)
    expect(url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/)
    expect(supervisor.status).toBe('running')
    await supervisor.stop()
    expect(supervisor.status).toBe('idle')
  })
})
