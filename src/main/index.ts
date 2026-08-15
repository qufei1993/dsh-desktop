import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'node:path'
import { channels, exactVersionSchema, type AppSnapshot, type InstallProgress } from '../shared/contracts'
import { AppController } from './controller'
import { DshSupervisor } from './dsh-supervisor'
import { DshRegistry } from './registry'
import { resolveRuntimePaths } from './runtime-paths'
import { StateStore } from './state-store'
import { VersionManager } from './version-manager'

let managerWindow: BrowserWindow | null = null
let dshWindow: BrowserWindow | null = null
let controller: AppController | null = null
let isQuitting = false

function isSafeExternalUrl(raw: string): boolean {
  try { return new URL(raw).protocol === 'https:' } catch { return false }
}

function sendToManager(channel: string, payload: AppSnapshot | InstallProgress): void {
  if (managerWindow && !managerWindow.isDestroyed()) managerWindow.webContents.send(channel, payload)
}

function createManagerWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 980,
    height: 700,
    minWidth: 760,
    minHeight: 560,
    show: false,
    title: 'DSH Desktop',
    backgroundColor: '#f4f1e8',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  })
  window.once('ready-to-show', () => window.show())
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
  window.webContents.on('will-navigate', (event, url) => {
    const current = window.webContents.getURL()
    if (current && new URL(url).origin !== new URL(current).origin) event.preventDefault()
  })
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  if (process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void window.loadFile(path.join(__dirname, '../renderer/index.html'))
  return window
}

async function openDshWindow(rawUrl: string): Promise<void> {
  const parsedUrl = new URL(rawUrl)
  const allowedOrigin = parsedUrl.origin
  if (parsedUrl.protocol !== 'http:' || parsedUrl.hostname !== '127.0.0.1' || !parsedUrl.port || parsedUrl.username || parsedUrl.password) {
    throw new Error('拒绝打开未经验证的 DSH 地址')
  }
  if (dshWindow && !dshWindow.isDestroyed()) {
    dshWindow.focus()
    return
  }
  const window = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 800,
    minHeight: 600,
    title: 'DeepSeek Harness',
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      partition: 'persist:dsh-web'
    }
  })
  dshWindow = window
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
  window.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin !== allowedOrigin) {
      event.preventDefault()
      if (isSafeExternalUrl(url)) void shell.openExternal(url)
    }
  })
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  window.on('closed', () => {
    dshWindow = null
    if (controller?.isRuntimeActive()) void controller.stop()
  })
  await window.loadURL(rawUrl)
}

function registerIpc(instance: AppController): void {
  const assertManager = (event: Electron.IpcMainInvokeEvent): void => {
    if (!managerWindow || event.sender.id !== managerWindow.webContents.id) throw new Error('拒绝未知窗口调用')
  }
  ipcMain.handle(channels.snapshot, async (event) => { assertManager(event); return await instance.snapshot() })
  ipcMain.handle(channels.refresh, async (event) => { assertManager(event); return await instance.refresh() })
  ipcMain.handle(channels.install, async (event, version: unknown) => {
    assertManager(event)
    return await instance.install(exactVersionSchema.parse(version))
  })
  ipcMain.handle(channels.select, async (event, version: unknown) => {
    assertManager(event)
    return await instance.select(exactVersionSchema.parse(version))
  })
  ipcMain.handle(channels.launch, async (event) => {
    assertManager(event)
    const snapshot = await instance.launch()
    if (!snapshot.runtimeUrl) throw new Error('官方 DSH 未返回本地地址')
    await openDshWindow(snapshot.runtimeUrl)
    return snapshot
  })
  ipcMain.handle(channels.stop, async (event) => {
    assertManager(event)
    return await instance.stop()
  })
  ipcMain.handle(channels.dismissUpdate, async (event, version: unknown) => {
    assertManager(event)
    return await instance.dismissUpdate(exactVersionSchema.parse(version))
  })
  ipcMain.handle(channels.openExternal, async (event, raw: unknown) => {
    assertManager(event)
    if (typeof raw !== 'string' || !isSafeExternalUrl(raw)) throw new Error('只允许打开 HTTPS 链接')
    await shell.openExternal(raw)
  })
}

app.whenReady().then(async () => {
  const resourcesRoot = app.isPackaged ? process.resourcesPath : path.join(app.getAppPath(), 'build-resources')
  const runtime = resolveRuntimePaths(resourcesRoot, app.isPackaged)
  const store = new StateStore(app.getPath('userData'))
  const versions = new VersionManager(app.getPath('userData'), path.join(resourcesRoot, 'dsh'), runtime)
  const supervisor = new DshSupervisor(runtime.node)
  controller = new AppController(app.getVersion(), store, new DshRegistry(), versions, supervisor, runtime)
  managerWindow = createManagerWindow()
  controller.on('snapshot', (snapshot: AppSnapshot) => {
    sendToManager(channels.stateChanged, snapshot)
    if (['idle', 'failed'].includes(snapshot.runtimeStatus) && dshWindow && !dshWindow.isDestroyed()) dshWindow.close()
  })
  controller.on('progress', (progress: InstallProgress) => sendToManager(channels.installProgress, progress))
  registerIpc(controller)
  await controller.initialize()
  void controller.refresh()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) managerWindow = createManagerWindow()
  })
}).catch((error) => {
  console.error(error instanceof Error ? error.message : 'DSH Desktop 初始化失败')
  app.quit()
})

app.on('before-quit', (event) => {
  if (isQuitting) return
  if (!controller?.isRuntimeActive()) return
  event.preventDefault()
  isQuitting = true
  void controller.stop().finally(() => app.quit())
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
