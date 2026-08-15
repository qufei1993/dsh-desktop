import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import type { AppUpdater } from 'electron-updater'
import { DesktopUpdater } from '../src/main/app-updater'

class FakeUpdater extends EventEmitter {
  autoDownload = true
  autoInstallOnAppQuit = true
  allowPrerelease = true
  checkForUpdates = vi.fn(async () => {
    this.emit('update-available', { version: '0.2.0' })
    return null
  })
  downloadUpdate = vi.fn(async () => {
    this.emit('download-progress', { percent: 42 })
    this.emit('update-downloaded', { version: '0.2.0' })
    return []
  })
  quitAndInstall = vi.fn()
}

describe('DesktopUpdater', () => {
  it('只检查，不在发现新版时自动下载', async () => {
    const fake = new FakeUpdater()
    const updater = new DesktopUpdater(fake as unknown as AppUpdater, '0.1.0', true)

    expect(await updater.check()).toMatchObject({ status: 'available', availableVersion: '0.2.0' })
    expect(fake.downloadUpdate).not.toHaveBeenCalled()
    expect(fake.autoDownload).toBe(false)
  })

  it('由用户下载完成后才允许重启安装', async () => {
    const fake = new FakeUpdater()
    const updater = new DesktopUpdater(fake as unknown as AppUpdater, '0.1.0', true)
    await updater.check()
    expect(await updater.download()).toMatchObject({ status: 'downloaded', percent: 100 })

    updater.install()
    expect(fake.quitAndInstall).toHaveBeenCalledWith(false, true)
  })

  it('开发模式不访问更新源', async () => {
    const fake = new FakeUpdater()
    const updater = new DesktopUpdater(fake as unknown as AppUpdater, '0.1.0', false)
    expect(await updater.check()).toMatchObject({ status: 'unsupported' })
    expect(fake.checkForUpdates).not.toHaveBeenCalled()
  })
})
