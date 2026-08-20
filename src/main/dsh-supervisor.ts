import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { EventEmitter } from 'node:events'
import os from 'node:os'
import semver from 'semver'
import type { RuntimeStatus } from '../shared/contracts'
import type { ResolvedDsh } from './version-manager'

const noOpenMinimumVersion = '0.1.0-rc.8'

export function dshWebArguments(dsh: ResolvedDsh): string[] {
  return [dsh.entry, 'web', ...(semver.gte(dsh.version, noOpenMinimumVersion) ? ['--no-open'] : []), '--port', '0']
}

export function parseLoopbackUrl(output: string): string | null {
  const matches = output.match(/https?:\/\/[^\s'"<>]+/g) ?? []
  for (const candidate of matches) {
    try {
      const url = new URL(candidate.replace(/[),.;]+$/, ''))
      if (url.protocol === 'http:' && url.hostname === '127.0.0.1' && url.port && !url.username && !url.password) {
        return url.origin
      }
    } catch { /* Continue scanning output. */ }
  }
  return null
}

export function prependRuntimePath(environment: NodeJS.ProcessEnv, entries: string[], platform = process.platform): NodeJS.ProcessEnv {
  const result = { ...environment }
  const pathKeys = Object.keys(result).filter((key) => key.toLowerCase() === 'path')
  const pathKey = pathKeys[0] ?? 'PATH'
  const separator = platform === 'win32' ? ';' : ':'
  const normalize = (value: string): string => platform === 'win32' ? value.toLowerCase() : value
  const seen = new Set<string>()
  const values = [...entries, ...(result[pathKey]?.split(separator) ?? [])].filter((value) => {
    if (!value) return false
    const normalized = normalize(value)
    if (seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })
  for (const duplicate of pathKeys.slice(1)) delete result[duplicate]
  result[pathKey] = values.join(separator)
  return result
}

export function dshRuntimeEnvironment(environment: NodeJS.ProcessEnv, entries: string[], platform = process.platform): NodeJS.ProcessEnv {
  return {
    ...prependRuntimePath(environment, entries, platform),
    // pnpm 11 still blocks unapproved dependency build scripts, but this keeps
    // that safety decision from turning an otherwise valid plugin update into
    // ERR_PNPM_IGNORED_BUILDS. This setting is scoped to the official DSH child.
    pnpm_config_strict_dep_builds: 'false'
  }
}

export class DshSupervisor extends EventEmitter {
  status: RuntimeStatus = 'idle'
  url: string | null = null
  private child: ChildProcessWithoutNullStreams | null = null

  constructor(private readonly nodePath: string, private readonly runtimePathEntries: string[] = []) {
    super()
  }

  async start(dsh: ResolvedDsh, timeoutMs = 30_000): Promise<string> {
    if (this.child || this.status === 'starting' || this.status === 'running') throw new Error('DSH 已经在运行')
    this.setStatus('starting')

    return await new Promise<string>((resolve, reject) => {
      const child = spawn(this.nodePath, dshWebArguments(dsh), {
        cwd: os.homedir(),
        env: dshRuntimeEnvironment(process.env, this.runtimePathEntries),
        shell: false,
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe']
      })
      child.stdin.end()
      this.child = child
      let settled = false
      let buffer = ''
      const finishWithError = (message: string): void => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        this.child = null
        this.url = null
        this.setStatus('failed')
        reject(new Error(message))
      }
      const consume = (chunk: Buffer | string): void => {
        buffer = `${buffer}${chunk.toString()}`.slice(-8_192)
        const url = parseLoopbackUrl(buffer)
        if (!url || settled) return
        settled = true
        clearTimeout(timer)
        this.url = url
        this.setStatus('running')
        resolve(url)
      }
      const timer = setTimeout(() => {
        child.kill()
        finishWithError('官方 DSH 在规定时间内未返回本地访问地址')
      }, timeoutMs)
      child.stdout.on('data', consume)
      child.stderr.on('data', consume)
      child.once('error', () => finishWithError('无法启动官方 DSH 进程'))
      child.once('exit', (code) => {
        clearTimeout(timer)
        this.child = null
        this.url = null
        if (!settled) finishWithError(`官方 DSH 启动失败（退出码 ${code ?? 'unknown'}）`)
        else {
          this.status = code === 0 ? 'idle' : 'failed'
          this.emit('status', this.status)
        }
      })
    })
  }

  async stop(): Promise<void> {
    const child = this.child
    if (!child) {
      this.url = null
      this.setStatus('idle')
      return
    }
    this.setStatus('stopping')
    await new Promise<void>((resolve) => {
      let finished = false
      const done = (): void => {
        if (finished) return
        finished = true
        clearTimeout(forceTimer)
        resolve()
      }
      const forceTimer = setTimeout(() => {
        child.kill('SIGKILL')
        done()
      }, 5_000)
      child.once('exit', done)
      child.kill('SIGTERM')
    })
    this.child = null
    this.url = null
    this.setStatus('idle')
  }

  private setStatus(status: RuntimeStatus): void {
    this.status = status
    this.emit('status', status)
  }
}
