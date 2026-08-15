import { describe, expect, it } from 'vitest'
import { DshRegistry } from '../src/main/registry'

describe('DshRegistry', () => {
  it('读取官方 latest 和合法版本列表', async () => {
    const fetcher = async () => new Response(JSON.stringify({
      versions: { '0.1.0-rc.5': {}, '0.1.0-rc.6': {}, '../bad': {} },
      'dist-tags': { latest: '0.1.0-rc.6' }
    }), { status: 200 })
    const registry = new DshRegistry(fetcher as typeof fetch)
    await expect(registry.catalog()).resolves.toEqual({ latest: '0.1.0-rc.6', versions: ['0.1.0-rc.5', '0.1.0-rc.6'] })
  })
})
