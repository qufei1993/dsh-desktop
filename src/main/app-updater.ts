import { EventEmitter } from 'node:events'
import type { AppUpdater, ProgressInfo, UpdateInfo } from 'electron-updater'
import type { AppUpdateSnapshot } from '../shared/contracts'

export class DesktopUpdater extends EventEmitter {
  private state: AppUpdateSnapshot
  private busy: Promise<void> | null = null

  constructor(
    private readonly updater: AppUpdater,
    currentVersion: string,
    private readonly supported: boolean
  ) {
    super()
    this.state = {
      currentVersion,
      availableVersion: null,
      status: supported ? 'idle' : 'unsupported',
      percent: null,
      message: supported ? null : '开发模式不检查应用更新'
    }
    updater.autoDownload = false
    updater.autoInstallOnAppQuit = false
    updater.allowPrerelease = false
    updater.on('checking-for-update', () => this.update({ status: 'checking', percent: null, message: null }))
    updater.on('update-available', (info: UpdateInfo) => this.update({ status: 'available', availableVersion: info.version, percent: null, message: null }))
    updater.on('update-not-available', () => this.update({ status: 'up-to-date', availableVersion: null, percent: null, message: '当前已是最新版' }))
    updater.on('download-progress', (info: ProgressInfo) => this.update({ status: 'downloading', percent: Math.max(0, Math.min(100, info.percent)), message: null }))
    updater.on('update-downloaded', (info: UpdateInfo) => this.update({ status: 'downloaded', availableVersion: info.version, percent: 100, message: '更新已下载，重启后安装' }))
    updater.on('error', (error: Error) => this.update({ status: 'error', percent: null, message: readableUpdateError(error) }))
  }

  snapshot(): AppUpdateSnapshot { return { ...this.state } }

  async check(): Promise<AppUpdateSnapshot> {
    if (!this.supported) return this.snapshot()
    if (this.state.status === 'downloading' || this.state.status === 'downloaded') return this.snapshot()
    await this.run(async () => { await this.updater.checkForUpdates() })
    return this.snapshot()
  }

  async download(): Promise<AppUpdateSnapshot> {
    if (!this.supported) return this.snapshot()
    if (this.state.status !== 'available') throw new Error('当前没有可下载的 DSH Desktop 更新')
    await this.run(async () => {
      this.update({ status: 'downloading', percent: 0, message: null })
      await this.updater.downloadUpdate()
    })
    return this.snapshot()
  }

  install(): void {
    if (this.state.status !== 'downloaded') throw new Error('更新尚未下载完成')
    this.updater.quitAndInstall(false, true)
  }

  private async run(action: () => Promise<void>): Promise<void> {
    if (this.busy) await this.busy
    else {
      this.busy = action().catch((error: unknown) => {
        const normalized = error instanceof Error ? error : new Error('应用更新失败')
        this.update({ status: 'error', percent: null, message: readableUpdateError(normalized) })
      }).finally(() => { this.busy = null })
      await this.busy
    }
  }

  private update(patch: Partial<AppUpdateSnapshot>): void {
    this.state = { ...this.state, ...patch }
    this.emit('changed', this.snapshot())
  }
}

function readableUpdateError(error: Error): string {
  if (/404|latest.*release|No published versions/i.test(error.message)) return '尚未发布可供自动更新的正式版本'
  return `检查更新失败：${error.message}`
}
