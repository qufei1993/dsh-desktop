import { EventEmitter } from 'node:events'
import semver from 'semver'
import type { AppSnapshot, InstallProgress, OfficialVersion } from '../shared/contracts'
import { exactVersionSchema } from '../shared/contracts'
import { runProcess } from './process-utils'
import { DshRegistry } from './registry'
import type { RuntimePaths } from './runtime-paths'
import { StateStore, type PersistedState } from './state-store'
import { DshSupervisor } from './dsh-supervisor'
import { VersionManager } from './version-manager'

export class AppController extends EventEmitter {
  private state: PersistedState = { schemaVersion: 1, selectedVersion: null, dismissedLatest: null }
  private latestVersion: string | null = null
  private availableVersions: OfficialVersion[] = []
  private nodeVersion: string | null = null
  private error: string | null = null
  private installing = false

  constructor(
    private readonly appVersion: string,
    private readonly store: StateStore,
    private readonly registry: DshRegistry,
    private readonly versions: VersionManager,
    private readonly supervisor: DshSupervisor,
    private readonly runtime: RuntimePaths
  ) {
    super()
    supervisor.on('status', () => { void this.emitSnapshot() })
  }

  async initialize(): Promise<AppSnapshot> {
    this.state = await this.store.read()
    try {
      const result = await runProcess(this.runtime.node, ['--version'], { timeoutMs: 5_000 })
      this.nodeVersion = result.stdout.trim()
    } catch {
      this.error = '内置 Node.js 运行环境不可用'
    }
    await this.ensureSelection()
    return await this.snapshot()
  }

  async refresh(): Promise<AppSnapshot> {
    try {
      const catalog = await this.registry.catalog()
      this.latestVersion = catalog.latest
      this.availableVersions = catalog.versions
      this.error = null
    } catch (error) {
      this.error = error instanceof Error ? error.message : '检查版本失败'
    }
    await this.ensureSelection()
    return await this.emitSnapshot()
  }

  async install(version: string): Promise<AppSnapshot> {
    if (this.installing) throw new Error('已有 DSH 版本正在安装')
    exactVersionSchema.parse(version)
    this.installing = true
    try {
      if (this.availableVersions.length === 0) {
        const catalog = await this.registry.catalog()
        this.latestVersion = catalog.latest
        this.availableVersions = catalog.versions
      }
      await this.versions.install(version, this.availableVersions.map((item) => item.version), (progress) => this.emit('progress', progress))
      if (!this.state.selectedVersion) {
        this.state.selectedVersion = version
        await this.store.write(this.state)
      }
      this.error = null
    } catch (error) {
      this.error = error instanceof Error ? error.message : '安装失败'
      throw error
    } finally {
      this.installing = false
      await this.emitSnapshot()
    }
    return await this.snapshot()
  }

  async select(version: string): Promise<AppSnapshot> {
    exactVersionSchema.parse(version)
    if (this.supervisor.status !== 'idle' && this.supervisor.status !== 'failed') throw new Error('请先停止正在运行的 DSH')
    await this.versions.resolve(version)
    this.state.selectedVersion = version
    await this.store.write(this.state)
    this.error = null
    return await this.emitSnapshot()
  }

  async launch(): Promise<AppSnapshot> {
    if (!this.state.selectedVersion) throw new Error('请先安装并选择一个 DSH 版本')
    try {
      const resolved = await this.versions.resolve(this.state.selectedVersion)
      await this.supervisor.start(resolved)
      this.error = null
    } catch (error) {
      this.error = error instanceof Error ? error.message : '启动失败'
      throw error
    } finally {
      await this.emitSnapshot()
    }
    return await this.snapshot()
  }

  async stop(): Promise<AppSnapshot> {
    await this.supervisor.stop()
    return await this.emitSnapshot()
  }

  async dismissUpdate(version: string): Promise<AppSnapshot> {
    exactVersionSchema.parse(version)
    this.state.dismissedLatest = version
    await this.store.write(this.state)
    return await this.emitSnapshot()
  }

  isRuntimeActive(): boolean {
    return !['idle', 'failed'].includes(this.supervisor.status)
  }

  async snapshot(): Promise<AppSnapshot> {
    const installedVersions = (await this.versions.list()).sort((a, b) => semver.rcompare(a.version, b.version))
    const availableVersions = [...this.availableVersions].sort((a, b) => semver.rcompare(a.version, b.version))
    return {
      appVersion: this.appVersion,
      nodeVersion: this.nodeVersion,
      latestVersion: this.latestVersion,
      selectedVersion: this.state.selectedVersion,
      dismissedLatest: this.state.dismissedLatest,
      installedVersions,
      availableVersions,
      runtimeStatus: this.supervisor.status,
      runtimeUrl: this.supervisor.url,
      error: this.error
    }
  }

  private async ensureSelection(): Promise<void> {
    const versions = await this.versions.list()
    if (this.state.selectedVersion && versions.some((item) => item.version === this.state.selectedVersion)) return
    this.state.selectedVersion = versions.sort((a, b) => semver.rcompare(a.version, b.version))[0]?.version ?? null
    await this.store.write(this.state)
  }

  private async emitSnapshot(): Promise<AppSnapshot> {
    const snapshot = await this.snapshot()
    this.emit('snapshot', snapshot)
    return snapshot
  }
}

export type ControllerProgress = InstallProgress
