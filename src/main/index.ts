import { app, BrowserWindow, ipcMain, Menu, nativeImage, net, Notification, session, shell } from 'electron'
import electronUpdater from 'electron-updater'
import path from 'node:path'
import semver from 'semver'
import { channels, exactVersionSchema, localePreferenceSchema, type AppLocale, type AppSnapshot, type AppUpdateSnapshot, type InstallProgress, type LocalePreference } from '../shared/contracts'
import { DesktopUpdater } from './app-updater'
import { applyNetworkProxy, configureNetworkProxy } from './network-proxy'
import { AppController } from './controller'
import { DshSupervisor } from './dsh-supervisor'
import { DshRegistry } from './registry'
import { resolveRuntimePaths } from './runtime-paths'
import { StateStore } from './state-store'
import { VersionManager } from './version-manager'

const APP_NAME = 'DSH Desktop'
const RELEASE_DOWNLOAD_URL = 'https://github.com/qufei1993/dsh-desktop/releases/latest'
let managerWindow: BrowserWindow | null = null
let dshWindow: BrowserWindow | null = null
let controller: AppController | null = null
let desktopUpdater: DesktopUpdater | null = null
let isQuitting = false
let isOpeningPrimary = false
let notifiedVersion: string | null = null
let notifiedDesktopVersion: string | null = null
let activeLocale: AppLocale = 'zh-CN'
let activeLocalePreference: LocalePreference = 'system'

app.setName(APP_NAME)
if (process.platform === 'darwin') process.title = APP_NAME

function applyDevelopmentDockIcon(): void {
  if (process.platform !== 'darwin' || app.isPackaged) return
  const dock = app.dock
  if (!dock) return
  const icon = nativeImage.createFromPath(path.join(app.getAppPath(), 'build', 'icon.png'))
  if (!icon.isEmpty()) dock.setIcon(icon)
}

function isSafeExternalUrl(raw: string): boolean {
  try { return new URL(raw).protocol === 'https:' } catch { return false }
}

function sendToManager(channel: string, payload: AppSnapshot | AppUpdateSnapshot | InstallProgress): void {
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
  const copy = mainCopy(activeLocale)
  const menuIconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'ui', 'version-manager.png')
    : path.join(app.getAppPath(), 'build', 'menu-version-manager.png')
  const menuIcon = nativeImage.createFromPath(menuIconPath).resize({ width: 16, height: 16 })
  if (process.platform === 'darwin' && !menuIcon.isEmpty()) menuIcon.setTemplateImage(true)
  const openVersions: Electron.MenuItemConstructorOptions = {
    id: 'version-manager',
    label: copy.versionManager,
    icon: menuIcon.isEmpty() ? undefined : menuIcon,
    accelerator: 'CmdOrCtrl+,',
    enabled: controller !== null,
    click: showManagerWindow
  }
  const about: Electron.MenuItemConstructorOptions = {
    id: 'about-dsh-desktop',
    label: copy.about,
    click: () => app.showAboutPanel()
  }
  const checkUpdates: Electron.MenuItemConstructorOptions = {
    id: 'check-for-updates',
    label: copy.checkUpdates,
    enabled: desktopUpdater !== null,
    click: () => { showManagerWindow(); void desktopUpdater?.check() }
  }
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin' ? [{
      label: APP_NAME,
      submenu: [about, { type: 'separator' as const }, openVersions, checkUpdates, languageMenu(copy), { type: 'separator' as const }, { role: 'hide' as const, label: copy.hide }, { role: 'hideOthers' as const, label: copy.hideOthers }, { type: 'separator' as const }, { role: 'quit' as const, label: copy.quit }]
    }] : [{ label: 'DSH Desktop', submenu: [about, { type: 'separator' as const }, openVersions, checkUpdates, languageMenu(copy), { type: 'separator' as const }, { role: 'quit' as const, label: copy.quit }] }]),
    { label: copy.edit, submenu: [{ role: 'undo', label: copy.undo }, { role: 'redo', label: copy.redo }, { type: 'separator' }, { role: 'cut', label: copy.cut }, { role: 'copy', label: copy.copy }, { role: 'paste', label: copy.paste }, { role: 'selectAll', label: copy.selectAll }] },
    { label: copy.window, submenu: [{ role: 'minimize', label: copy.minimize }, { role: 'zoom', label: copy.zoom }] }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function languageMenu(copy: ReturnType<typeof mainCopy>): Electron.MenuItemConstructorOptions {
  return {
    label: copy.language,
    submenu: [
      { label: '简体中文', type: 'radio', checked: activeLocale === 'zh-CN', click: () => { void controller?.setLocale('zh-CN') } },
      { label: 'English', type: 'radio', checked: activeLocale === 'en-US', click: () => { void controller?.setLocale('en-US') } }
    ]
  }
}

function updateAboutPanel(): void {
  const copy = mainCopy(activeLocale)
  app.setAboutPanelOptions({
    applicationName: APP_NAME,
    applicationVersion: app.getVersion(),
    version: copy.version(app.getVersion()),
    copyright: 'Copyright © 2026 DSH Desktop contributors',
    credits: copy.credits,
    website: 'https://github.com/qufei1993/dsh-desktop'
  })
}

function notifyDesktopUpdate(snapshot: AppUpdateSnapshot): void {
  if (snapshot.status !== 'available' || !snapshot.availableVersion || notifiedDesktopVersion === snapshot.availableVersion) return
  notifiedDesktopVersion = snapshot.availableVersion
  if (!Notification.isSupported()) return
  const copy = mainCopy(activeLocale)
  const notification = new Notification({
    title: copy.desktopUpdateTitle(snapshot.availableVersion),
    body: copy.desktopUpdateBody
  })
  notification.on('click', showManagerWindow)
  notification.show()
}

function notifyDshUpdate(snapshot: AppSnapshot): void {
  if (!snapshot.latestVersion || !snapshot.selectedVersion || snapshot.dismissedLatest === snapshot.latestVersion) return
  if (!semver.gt(snapshot.latestVersion, snapshot.selectedVersion) || notifiedVersion === snapshot.latestVersion) return
  notifiedVersion = snapshot.latestVersion
  if (!Notification.isSupported()) return
  const copy = mainCopy(activeLocale)
  const notification = new Notification({
    title: copy.dshUpdateTitle(snapshot.latestVersion),
    body: copy.dshUpdateBody(snapshot.selectedVersion)
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
  ipcMain.handle(channels.setLocale, async (event, raw: unknown) => {
    assertManager(event)
    return await instance.setLocale(localePreferenceSchema.parse(raw))
  })
  ipcMain.handle(channels.appUpdateSnapshot, (event) => {
    assertManager(event)
    return desktopUpdater?.snapshot()
  })
  ipcMain.handle(channels.appUpdateCheck, async (event) => {
    assertManager(event)
    return await desktopUpdater?.check()
  })
  ipcMain.handle(channels.appUpdateDownload, async (event) => {
    assertManager(event)
    return await desktopUpdater?.download()
  })
  ipcMain.handle(channels.appUpdateInstall, async (event) => {
    assertManager(event)
    if (!desktopUpdater) return
    if (instance.isRuntimeActive()) await instance.stop()
    desktopUpdater.install()
  })
}

installApplicationMenu()

app.whenReady().then(async () => {
  applyDevelopmentDockIcon()
  if (process.platform === 'win32') app.setAppUserModelId('dev.dsh.desktop')
  const proxy = await configureNetworkProxy(session.defaultSession)
  await applyNetworkProxy(electronUpdater.autoUpdater.netSession, proxy)
  await session.fromPartition('persist:dsh-web').setProxy({ mode: 'direct' })
  const resourcesRoot = app.isPackaged ? process.resourcesPath : path.join(app.getAppPath(), 'build-resources')
  const runtime = resolveRuntimePaths(resourcesRoot, app.isPackaged)
  const store = new StateStore(app.getPath('userData'))
  const versions = new VersionManager(app.getPath('userData'), path.join(resourcesRoot, 'dsh'), runtime, proxy.url)
  const supervisor = new DshSupervisor(runtime.node)
  controller = new AppController(app.getVersion(), store, new DshRegistry(net.fetch as typeof fetch), versions, supervisor, runtime, normalizeSystemLocale(app.getLocale()))
  desktopUpdater = new DesktopUpdater(
    electronUpdater.autoUpdater,
    app.getVersion(),
    app.isPackaged,
    process.platform === 'darwin' ? 'manual' : 'automatic',
    async () => { await shell.openExternal(RELEASE_DOWNLOAD_URL) }
  )
  desktopUpdater.on('changed', (snapshot: AppUpdateSnapshot) => {
    sendToManager(channels.appUpdateChanged, snapshot)
    notifyDesktopUpdate(snapshot)
  })
  controller.on('snapshot', (snapshot: AppSnapshot) => {
    if (snapshot.locale !== activeLocale || snapshot.localePreference !== activeLocalePreference) {
      activeLocale = snapshot.locale
      activeLocalePreference = snapshot.localePreference
      installApplicationMenu()
      updateAboutPanel()
    }
    sendToManager(channels.stateChanged, snapshot)
    if (['idle', 'failed'].includes(snapshot.runtimeStatus) && dshWindow && !dshWindow.isDestroyed()) dshWindow.close()
  })
  controller.on('progress', (progress: InstallProgress) => sendToManager(channels.installProgress, progress))
  registerIpc(controller)
  const initialSnapshot = await controller.initialize()
  activeLocale = initialSnapshot.locale
  activeLocalePreference = initialSnapshot.localePreference
  installApplicationMenu()
  updateAboutPanel()
  await openPrimaryWindow()
  void controller.refresh().then(notifyDshUpdate)
  setTimeout(() => { void desktopUpdater?.check() }, 4_000)

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

function normalizeSystemLocale(locale: string): AppLocale {
  return locale.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US'
}

function mainCopy(locale: AppLocale) {
  if (locale === 'en-US') return {
    versionManager: 'Version Manager…', about: 'About DSH Desktop', checkUpdates: 'Check for DSH Desktop Updates…',
    language: 'Language', edit: 'Edit', window: 'Window', hide: 'Hide DSH Desktop', hideOthers: 'Hide Others', quit: 'Quit DSH Desktop',
    undo: 'Undo', redo: 'Redo', cut: 'Cut', copy: 'Copy', paste: 'Paste', selectAll: 'Select All', minimize: 'Minimize', zoom: 'Zoom',
    version: (version: string) => `Version ${version}`,
    credits: 'DeepSeek Harness community desktop client',
    desktopUpdateTitle: (version: string) => `DSH Desktop ${version} is available`,
    desktopUpdateBody: 'Click to view. You decide whether to download and install it.',
    dshUpdateTitle: (version: string) => `DSH ${version} is available`,
    dshUpdateBody: (version: string) => `You are still using ${version}. Click to open Version Manager.`
  }
  return {
    versionManager: '版本管理…', about: '关于 DSH Desktop', checkUpdates: '检查 DSH Desktop 更新…',
    language: '语言', edit: '编辑', window: '窗口', hide: '隐藏 DSH Desktop', hideOthers: '隐藏其他应用', quit: '退出 DSH Desktop',
    undo: '撤销', redo: '重做', cut: '剪切', copy: '复制', paste: '粘贴', selectAll: '全选', minimize: '最小化', zoom: '缩放',
    version: (version: string) => `版本 ${version}`,
    credits: 'DeepSeek Harness 社区桌面客户端',
    desktopUpdateTitle: (version: string) => `DSH Desktop ${version} 可以更新`,
    desktopUpdateBody: '点击查看，是否下载和安装由你决定。',
    dshUpdateTitle: (version: string) => `DSH ${version} 可以安装`,
    dshUpdateBody: (version: string) => `当前继续使用 ${version}。点击打开版本管理。`
  }
}
