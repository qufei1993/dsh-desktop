import { spawn } from 'node:child_process'
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { exactVersionSchema, officialPackageName, type InstallProgress, type InstalledVersion } from '../shared/contracts'
import type { RuntimePaths } from './runtime-paths'
import { npmProxyEnvironment } from './network-proxy'

interface PackageManifest {
  name?: string
  version?: string
  bin?: string | Record<string, string>
}

export interface ResolvedDsh {
  version: string
  root: string
  entry: string
  source: 'bundled' | 'installed'
}

export class VersionManager {
  readonly versionsDir: string

  constructor(
    userData: string,
    private readonly bundledDir: string,
    private readonly runtime: RuntimePaths,
    private readonly proxyUrl: string | null = null
  ) {
    this.versionsDir = path.join(userData, 'dsh-versions')
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
      await writeFile(path.join(staging, 'package.json'), `${JSON.stringify({
        name: 'dsh-desktop-managed-version', version: '0.0.0', private: true,
        dependencies: { [officialPackageName]: version }
      })}\n`)
      progress({ version, phase: 'downloading', message: `正在安装官方 DSH ${version}` })
      await this.runNpmInstall(staging, version)
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

  private async runNpmInstall(prefix: string, version: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(this.runtime.node, [
        this.runtime.npmCli,
        'install',
        '--prefix', prefix,
        '--no-audit',
        '--no-fund',
        '--prefer-online',
        '--registry=https://registry.npmjs.org/',
        '--ignore-scripts=false'
      ], { env: npmProxyEnvironment(this.proxyUrl), shell: false, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
      let stderr = ''
      child.stderr.setEncoding('utf8').on('data', (chunk: string) => { stderr += chunk })
      child.once('error', reject)
      child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`npm 安装失败（退出码 ${code ?? 'unknown'}）：${stderr.slice(-500)}`)))
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
