import { connect } from 'node:net'

const proxyProbeHost = '127.0.0.1'
const proxyProbePort = 7890
const proxyTarget = 'https://registry.npmjs.org/'
const localBypass = '<local>;localhost;127.0.0.1;[::1]'

export type ProxySource = 'environment' | 'system' | 'local' | 'direct'

export interface ProxyResolution {
  source: ProxySource
  url: string | null
}

interface ProxySession {
  setProxy(config: { mode: 'system' | 'fixed_servers'; proxyRules?: string; proxyBypassRules?: string }): Promise<void>
  resolveProxy(url: string): Promise<string>
}

export async function configureNetworkProxy(
  targetSession: ProxySession,
  environment: NodeJS.ProcessEnv = process.env,
  probeLocalProxy: () => Promise<boolean> = () => isLocalPortOpen(proxyProbeHost, proxyProbePort)
): Promise<ProxyResolution> {
  const environmentProxy = proxyFromEnvironment(environment)
  if (environmentProxy) {
    await targetSession.setProxy({ mode: 'fixed_servers', proxyRules: environmentProxy, proxyBypassRules: localBypass })
    return { source: 'environment', url: environmentProxy }
  }

  await targetSession.setProxy({ mode: 'system' })
  const systemProxy = proxyFromElectronRules(await targetSession.resolveProxy(proxyTarget))
  if (systemProxy) return { source: 'system', url: systemProxy }

  if (await probeLocalProxy()) {
    const localProxy = `http://${proxyProbeHost}:${proxyProbePort}`
    await targetSession.setProxy({ mode: 'fixed_servers', proxyRules: localProxy, proxyBypassRules: localBypass })
    return { source: 'local', url: localProxy }
  }

  return { source: 'direct', url: null }
}

export async function applyNetworkProxy(targetSession: ProxySession, resolution: ProxyResolution): Promise<void> {
  if (resolution.source === 'environment' || resolution.source === 'local') {
    await targetSession.setProxy({ mode: 'fixed_servers', proxyRules: resolution.url ?? undefined, proxyBypassRules: localBypass })
  } else {
    await targetSession.setProxy({ mode: 'system' })
  }
}

export function proxyFromElectronRules(rules: string): string | null {
  for (const candidate of rules.split(';')) {
    const [kind, address] = candidate.trim().split(/\s+/, 2)
    if (!address || kind.toUpperCase() === 'DIRECT') continue
    const protocol = ({ PROXY: 'http', HTTP: 'http', HTTPS: 'https', SOCKS: 'socks5', SOCKS5: 'socks5', SOCKS4: 'socks4' } as Record<string, string>)[kind.toUpperCase()]
    if (protocol) return normalizeProxyUrl(`${protocol}://${address}`)
  }
  return null
}

function proxyFromEnvironment(environment: NodeJS.ProcessEnv): string | null {
  for (const key of ['HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy', 'ALL_PROXY', 'all_proxy']) {
    const value = environment[key]?.trim()
    if (value) {
      const normalized = normalizeProxyUrl(value)
      if (normalized) return normalized
    }
  }
  return null
}

function normalizeProxyUrl(raw: string): string | null {
  try {
    const parsed = new URL(raw)
    if (!['http:', 'https:', 'socks:', 'socks4:', 'socks5:'].includes(parsed.protocol) || !parsed.hostname) return null
    return parsed.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

async function isLocalPortOpen(host: string, port: number): Promise<boolean> {
  return await new Promise((resolve) => {
    const socket = connect({ host, port })
    const finish = (open: boolean): void => {
      socket.removeAllListeners()
      socket.destroy()
      resolve(open)
    }
    socket.setTimeout(200)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
  })
}

export function npmProxyEnvironment(proxyUrl: string | null, environment: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  if (!proxyUrl) return environment
  const noProxy = [environment.NO_PROXY, environment.no_proxy, 'localhost,127.0.0.1,::1'].filter(Boolean).join(',')
  return {
    ...environment,
    HTTP_PROXY: proxyUrl,
    HTTPS_PROXY: proxyUrl,
    http_proxy: proxyUrl,
    https_proxy: proxyUrl,
    NO_PROXY: noProxy,
    no_proxy: noProxy
  }
}
