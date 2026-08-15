import { describe, expect, it, vi } from 'vitest'
import { applyNetworkProxy, configureNetworkProxy, npmProxyEnvironment, proxyFromElectronRules } from '../src/main/network-proxy'

function fakeSession(rules: string) {
  return {
    setProxy: vi.fn(async () => undefined),
    resolveProxy: vi.fn(async () => rules)
  }
}

describe('network proxy', () => {
  it('优先使用明确设置的代理环境变量', async () => {
    const target = fakeSession('DIRECT')
    const result = await configureNetworkProxy(target, { HTTPS_PROXY: 'http://127.0.0.1:7897' }, async () => false)
    expect(result).toEqual({ source: 'environment', url: 'http://127.0.0.1:7897' })
    expect(target.resolveProxy).not.toHaveBeenCalled()
  })

  it('读取系统代理规则并传给 npm', async () => {
    const target = fakeSession('PROXY 127.0.0.1:7890; DIRECT')
    const result = await configureNetworkProxy(target, {}, async () => false)
    expect(result).toEqual({ source: 'system', url: 'http://127.0.0.1:7890' })
    expect(npmProxyEnvironment(result.url, {})).toMatchObject({
      HTTPS_PROXY: 'http://127.0.0.1:7890',
      NO_PROXY: 'localhost,127.0.0.1,::1'
    })
  })

  it('系统直连时自动探测 Skills Hub 同款 7890 端口', async () => {
    const target = fakeSession('DIRECT')
    const result = await configureNetworkProxy(target, {}, async () => true)
    expect(result).toEqual({ source: 'local', url: 'http://127.0.0.1:7890' })
    expect(target.setProxy).toHaveBeenLastCalledWith(expect.objectContaining({ mode: 'fixed_servers', proxyRules: 'http://127.0.0.1:7890' }))
  })

  it('把探测结果应用到独立的应用更新会话', async () => {
    const target = fakeSession('DIRECT')
    await applyNetworkProxy(target, { source: 'local', url: 'http://127.0.0.1:7890' })
    expect(target.setProxy).toHaveBeenCalledWith(expect.objectContaining({ proxyRules: 'http://127.0.0.1:7890' }))
  })

  it('解析 Chromium 常见代理规则', () => {
    expect(proxyFromElectronRules('HTTPS proxy.example:443; DIRECT')).toBe('https://proxy.example')
    expect(proxyFromElectronRules('SOCKS5 127.0.0.1:1080')).toBe('socks5://127.0.0.1:1080')
    expect(proxyFromElectronRules('DIRECT')).toBeNull()
  })
})
