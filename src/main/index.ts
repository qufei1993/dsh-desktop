import { app, BrowserWindow, ipcMain, Menu, Notification, shell } from 'electron'
import path from 'node:path'
import semver from 'semver'
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
let isOpeningPrimary = false
let notifiedVersion: string | null = null

function isSafeExternalUrl(raw: string): boolean {
  try { return new URL(raw).protocol === 'https:' } catch { return false }
}

function sendToManager(channel: string, payload: AppSnapshot | InstallProgress): void {
  if (managerWindow && !managerWindow.isDestroyed()) managerWindow.webContents.send(channel, payload)
}

function createManagerWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1040,
    height: 760,
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
  window.on('closed', () => { managerWindow = null })
  if (process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void window.loadFile(path.join(__dirname, '../renderer/index.html'))
  return window
}

function showManagerWindow(): void {
  if (managerWindow && !managerWindow.isDestroyed()) {
    managerWindow.show()
    managerWindow.focus()
    return
  }
  managerWindow = createManagerWindow()
}

function installApplicationMenu(): void {
  const openVersions: Electron.MenuItemConstructorOptions = {
    id: 'version-manager',
    label: '版本管理…',
    accelerator: 'CmdOrCtrl+,',
    click: showManagerWindow
  }
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin' ? [{
      label: app.name,
      submenu: [openVersions, { type: 'separator' as const }, { role: 'hide' as const }, { role: 'hideOthers' as const }, { type: 'separator' as const }, { role: 'quit' as const }]
    }] : [{ label: 'DSH Desktop', submenu: [openVersions, { type: 'separator' as const }, { role: 'quit' as const }] }]),
    { label: '编辑', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: '窗口', submenu: [{ role: 'minimize' }, { role: 'zoom' }] }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function notifyDshUpdate(snapshot: AppSnapshot): void {
  if (!snapshot.latestVersion || !snapshot.selectedVersion || snapshot.dismissedLatest === snapshot.latestVersion) return
  if (!semver.gt(snapshot.latestVersion, snapshot.selectedVersion) || notifiedVersion === snapshot.latestVersion) return
  notifiedVersion = snapshot.latestVersion
  if (!Notification.isSupported()) return
  const notification = new Notification({
    title: `DSH ${snapshot.latestVersion} 可以安装`,
    body: `当前继续使用 ${snapshot.selectedVersion}。点击打开版本管理。`
  })
  notification.on('click', showManagerWindow)
  notification.show()
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

async function openPrimaryWindow(): Promise<void> {
  if (!controller || isOpeningPrimary) return
  isOpeningPrimary = true
  try {
    const current = await controller.snapshot()
    if (current.runtimeStatus === 'running' && current.runtimeUrl) {
      await openDshWindow(current.runtimeUrl)
      return
    }
    const launched = await controller.launch()
    if (!launched.runtimeUrl) throw new Error('官方 DSH 未返回本地地址')
    await openDshWindow(launched.runtimeUrl)
  } catch {
    showManagerWindow()
  } finally {
    isOpeningPrimary = false
  }
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
    const target = exactVersionSchema.parse(version)
    if (instance.isRuntimeActive()) await instance.stop()
    await instance.select(target)
    const snapshot = await instance.launch()
    if (!snapshot.runtimeUrl) throw new Error('官方 DSH 未返回本地地址')
    await openDshWindow(snapshot.runtimeUrl)
    return snapshot
  })
  ipcMain.handle(channels.launch, async (event) => {
    assertManager(event)
    const current = await instance.snapshot()
    const snapshot = current.runtimeStatus === 'running' && current.runtimeUrl ? current : await instance.launch()
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
  if (process.platform === 'win32') app.setAppUserModelId('dev.dsh.desktop')
  const resourcesRoot = app.isPackaged ? process.resourcesPath : path.join(app.getAppPath(), 'build-resources')
  const runtime = resolveRuntimePaths(resourcesRoot, app.isPackaged)
  const store = new StateStore(app.getPath('userData'))
  const versions = new VersionManager(app.getPath('userData'), path.join(resourcesRoot, 'dsh'), runtime)
  const supervisor = new DshSupervisor(runtime.node)
  controller = new AppController(app.getVersion(), store, new DshRegistry(), versions, supervisor, runtime)
  controller.on('snapshot', (snapshot: AppSnapshot) => {
    sendToManager(channels.stateChanged, snapshot)
    if (['idle', 'failed'].includes(snapshot.runtimeStatus) && dshWindow && !dshWindow.isDestroyed()) dshWindow.close()
  })
  controller.on('progress', (progress: InstallProgress) => sendToManager(channels.installProgress, progress))
  registerIpc(controller)
  installApplicationMenu()
  await controller.initialize()
  await openPrimaryWindow()
  void controller.refresh().then(notifyDshUpdate)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void openPrimaryWindow()
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
