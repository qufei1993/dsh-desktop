import { spawn } from 'node:child_process'
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { exactVersionSchema, officialPackageName, type InstallProgress, type InstalledVersion } from '../shared/contracts'
import type { RuntimePaths } from './runtime-paths'
import { npmProxyEnvironment } from './network-proxy'
import { prependRuntimePath } from './runtime-path-environment'

interface PackageManifest {
  name?: string
  version?: string
  bin?: string | Record<string, string>
}

const pnpmBuildPolicy = `allowBuilds:
  '@deepseek-ai/dsh-subprocess-local': true
  '@google/genai': false
  koffi: false
  node-pty: false
  protobufjs: false
`

function summarizePnpmFailure(output: string): string {
  const lines = output
    .replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('Progress:') && !/^\++$/.test(line))
  return lines.slice(-8).join(' | ').slice(-1_500)
}

export interface ResolvedDsh {
  version: string
  root: string
  entry: string
  source: 'bundled' | 'installed'
}

export class VersionManager {
  readonly versionsDir: string
  readonly installFailureLog: string

  constructor(
    userData: string,
    private readonly bundledDir: string,
    private readonly runtime: RuntimePaths,
    private readonly proxyUrl: string | null = null,
    private readonly installStallTimeoutMs = 5 * 60_000
  ) {
    this.versionsDir = path.join(userData, 'dsh-versions')
    this.installFailureLog = path.join(userData, 'dsh-install-failure.log')
  }

  async cleanupInterruptedInstalls(): Promise<void> {
    let names: string[] = []
    try { names = await readdir(this.versionsDir) } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    await Promise.all(names
      .filter((name) => name.startsWith('.install-'))
      .map(async (name) => { await rm(path.join(this.versionsDir, name), { recursive: true, force: true }) }))
  }

  async list(): Promise<InstalledVersion[]> {
    const entries: InstalledVersion[] = []
    for (const [base, source] of [[this.bundledDir, 'bundled'], [this.versionsDir, 'installed']] as const) {
      let names: string[] = []
      try { names = await readdir(base) } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      }
      for (const version of names) {
        if (!exactVersionSchema.safeParse(version).success) continue
        try {
          await this.resolveAt(path.join(base, version), version, source)
          entries.push({ version, source })
        } catch { /* Ignore incomplete directories. */ }
      }
    }
    return entries.filter((item, index, all) => all.findIndex((other) => other.version === item.version) === index)
  }

  async resolve(version: string): Promise<ResolvedDsh> {
    exactVersionSchema.parse(version)
    const installed = path.join(this.versionsDir, version)
    if (existsSync(installed)) return await this.resolveAt(installed, version, 'installed')
    return await this.resolveAt(path.join(this.bundledDir, version), version, 'bundled')
  }

  async install(version: string, availableVersions: string[], progress: (value: InstallProgress) => void): Promise<void> {
    exactVersionSchema.parse(version)
    if (!availableVersions.includes(version)) throw new Error('该版本不在官方 npm 版本目录中')
    await mkdir(this.versionsDir, { recursive: true })
    const destination = path.join(this.versionsDir, version)
    if (existsSync(destination)) {
      await this.resolveAt(destination, version, 'installed')
      return
    }
    const staging = path.join(this.versionsDir, `.install-${version}-${Date.now()}`)
    await mkdir(staging, { recursive: true })
    try {
      await Promise.all([
        writeFile(path.join(staging, 'package.json'), `${JSON.stringify({
          name: 'dsh-desktop-managed-version', version: '0.0.0', private: true,
          dependencies: { [officialPackageName]: version }
        })}\n`),
        writeFile(path.join(staging, 'pnpm-workspace.yaml'), pnpmBuildPolicy)
      ])
      progress({ version, phase: 'downloading', message: `正在安装官方 DSH ${version}` })
      await this.runPnpmInstall(staging, version, progress)
      progress({ version, phase: 'validating', message: '正在校验官方包版本和入口' })
      await this.resolveAt(staging, version, 'installed')
      await rename(staging, destination)
      progress({ version, phase: 'complete', message: `DSH ${version} 已安装` })
    } catch (error) {
      await rm(staging, { recursive: true, force: true })
      progress({ version, phase: 'failed', message: error instanceof Error ? error.message : '安装失败' })
      throw error
    }
  }

  async uninstall(version: string): Promise<void> {
    exactVersionSchema.parse(version)
    const destination = path.join(this.versionsDir, version)
    if (!existsSync(destination)) throw new Error('该版本不是用户安装的 DSH 版本')
    await this.resolveAt(destination, version, 'installed')
    await rm(destination, { recursive: true, force: true })
  }

  private async runPnpmInstall(prefix: string, version: string, progress: (value: InstallProgress) => void): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(this.runtime.node, [
        this.runtime.pnpmCli,
        'install',
        '--dir', prefix,
        '--prefer-offline',
        '--registry=https://registry.npmjs.org/',
        '--reporter=append-only'
      ], {
        env: {
          ...prependRuntimePath(npmProxyEnvironment(this.proxyUrl), [path.dirname(this.runtime.node), this.runtime.commandDir]),
          CI: '1',
          pnpm_config_minimum_release_age: '0',
          // Only the official helper permission fix is allowlisted in pnpm-workspace.yaml.
          // Future unapproved native builds stay blocked without making installation fatal.
          pnpm_config_strict_dep_builds: 'false'
        },
        shell: false,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      })
      let settled = false
      let output = ''
      let lineBuffer = ''
      let lastProgress = ''
      let stallTimer: NodeJS.Timeout
      let terminationError: Error | null = null
      const finish = (error?: Error): void => {
        if (settled) return
        settled = true
        clearTimeout(stallTimer)
        if (error) reject(error)
        else resolve()
      }
      const resetStallTimer = (): void => {
        if (terminationError) return
        clearTimeout(stallTimer)
        stallTimer = setTimeout(() => {
          terminationError = new Error(`pnpm 安装超过 ${Math.round(this.installStallTimeoutMs / 60_000)} 分钟无进展`)
          child.kill()
        }, this.installStallTimeoutMs)
      }
      const consume = (chunk: string): void => {
        resetStallTimer()
        output = `${output}${chunk}`.slice(-512 * 1_024)
        lineBuffer += chunk
        const lines = lineBuffer.split(/\r?\n/)
        lineBuffer = lines.pop() ?? ''
        for (const line of lines) {
          const match = line.match(/Progress: resolved (\d+), reused (\d+), downloaded (\d+), added (\d+)/)
          if (!match) continue
          const signature = match.slice(1).join(':')
          if (signature === lastProgress) continue
          lastProgress = signature
          progress({
            version,
            phase: 'downloading',
            message: `正在获取依赖：已解析 ${match[1]}，已复用 ${match[2]}，已下载 ${match[3]}，已安装 ${match[4]}`
          })
        }
      }
      child.stdout.setEncoding('utf8').on('data', consume)
      child.stderr.setEncoding('utf8').on('data', consume)
      child.once('error', (error) => finish(error))
      child.once('exit', (code) => {
        if (terminationError) {
          finish(terminationError)
          return
        }
        if (code === 0) {
          finish()
          return
        }
        const detail = summarizePnpmFailure(output)
        const error = new Error(`pnpm 安装失败（退出码 ${code ?? 'unknown'}）：${detail || '未返回错误详情'}`)
        const log = [`DSH ${version}`, new Date().toISOString(), '', output].join('\n')
        void writeFile(this.installFailureLog, log).then(() => finish(error), () => finish(error))
      })
      resetStallTimer()
    })
  }

  private async resolveAt(root: string, version: string, source: ResolvedDsh['source']): Promise<ResolvedDsh> {
    const packageRoot = path.join(root, 'node_modules', '@deepseek-ai', 'dsh')
    const manifest = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8')) as PackageManifest
    if (manifest.name !== officialPackageName || manifest.version !== version) throw new Error('官方 DSH 包身份或版本校验失败')
    const bin = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin?.dsh
    if (!bin) throw new Error('官方 DSH 包未提供 dsh CLI 入口')
    const entry = path.resolve(packageRoot, bin)
    if (!entry.startsWith(`${packageRoot}${path.sep}`) || !existsSync(entry)) throw new Error('官方 DSH CLI 入口无效')
    return { version, root, entry, source }
  }
}
