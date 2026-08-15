import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, net, Notification, session, shell } from 'electron'
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
const LATEST_RELEASE_API_URL = 'https://api.github.com/repos/qufei1993/dsh-desktop/releases/latest'
const LATEST_RELEASE_API_URL_OVERRIDE = process.env.DSH_DESKTOP_TEST_RELEASE_API_URL
const TEST_CURRENT_VERSION = process.env.DSH_DESKTOP_TEST_CURRENT_VERSION
const TEST_ENABLE_UPDATE = process.env.DSH_DESKTOP_TEST_ENABLE_UPDATE
const DEEPSEEK_HARNESS_WINDOW_TITLE = 'DeepSeek Harness'
let managerWindow: BrowserWindow | null = null
let dshWindow: BrowserWindow | null = null
let dshUpdatePopover: BrowserWindow | null = null
let latestSnapshotForWindowTitle: AppSnapshot | null = null
let controller: AppController | null = null
let desktopUpdater: DesktopUpdater | null = null
let isQuitting = false
let isOpeningPrimary = false
let notifiedVersion: string | null = null
let notifiedDesktopVersion: string | null = null
let dismissedDshPopoverVersion: string | null = null
let dshPopoverSignature: string | null = null
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

async function checkLatestManualRelease(): Promise<string | null> {
  const response = await net.fetch(LATEST_RELEASE_API_URL_OVERRIDE ?? LATEST_RELEASE_API_URL, { headers: { accept: 'application/vnd.github+json' } })
  if (!response.ok) throw new Error(`GitHub Release 查询失败：${response.status}`)
  const release = await response.json() as { tag_name?: unknown; draft?: unknown; prerelease?: unknown }
  if (release.draft === true || release.prerelease === true || typeof release.tag_name !== 'string') return null
  const version = release.tag_name.replace(/^v/, '')
  if (!semver.valid(version)) throw new Error('GitHub Release 版本号无效')
  return version
}

function sendToManager(channel: string, payload: AppSnapshot | AppUpdateSnapshot | InstallProgress): void {
  if (managerWindow && !managerWindow.isDestroyed()) managerWindow.webContents.send(channel, payload)
}

function dshWindowTitle(snapshot: AppSnapshot): string {
  const copy = mainCopy(snapshot.locale)
  if (!snapshot.selectedVersion) return DEEPSEEK_HARNESS_WINDOW_TITLE
  const currentVersion = `v${snapshot.selectedVersion}`
  if (snapshot.selectedVersion && snapshot.latestVersion && semver.gt(snapshot.latestVersion, snapshot.selectedVersion)) {
    return `${DEEPSEEK_HARNESS_WINDOW_TITLE} · ${currentVersion} · ${copy.dshWindowUpdateTag(snapshot.latestVersion)}`
  }
  return `${DEEPSEEK_HARNESS_WINDOW_TITLE} · ${currentVersion}`
}

function setDshWindowTitle(snapshot: AppSnapshot): void {
  if (!dshWindow || dshWindow.isDestroyed()) return
  dshWindow.setTitle(dshWindowTitle(snapshot))
}

function hasDshUpdate(snapshot: AppSnapshot): snapshot is AppSnapshot & { latestVersion: string } {
  return !!(snapshot.selectedVersion && snapshot.latestVersion && semver.gt(snapshot.latestVersion, snapshot.selectedVersion))
}

function updateMenuDshUpdateHint(snapshot: AppSnapshot): void {
  const menu = Menu.getApplicationMenu()
  if (!menu) return
  const item = menu.getMenuItemById('quick-update-dsh')
  if (!item) return
  if (!hasDshUpdate(snapshot)) {
    const copy = mainCopy(snapshot.locale)
    item.enabled = false
    item.label = copy.versionManager
    return
  }
  const copy = mainCopy(snapshot.locale)
  item.enabled = true
  item.label = copy.openDshUpdateManager(snapshot.latestVersion)
}

function escapePopoverHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character)
}

function positionDshUpdatePopover(): void {
  if (!dshWindow || dshWindow.isDestroyed() || !dshUpdatePopover || dshUpdatePopover.isDestroyed()) return
  const parent = dshWindow.getBounds()
  const [width, height] = dshUpdatePopover.getSize()
  dshUpdatePopover.setPosition(parent.x + parent.width - width - 18, parent.y + 72)
}

function hideDshUpdatePopover(): void {
  if (dshUpdatePopover && !dshUpdatePopover.isDestroyed()) dshUpdatePopover.hide()
}

function showDshUpdatePopover(snapshot: AppSnapshot): void {
  if (!dshWindow || dshWindow.isDestroyed() || !hasDshUpdate(snapshot) || dismissedDshPopoverVersion === snapshot.latestVersion) {
    hideDshUpdatePopover()
    return
  }
  const signature = `${snapshot.locale}:${snapshot.latestVersion}:${snapshot.selectedVersion}`
  if (dshUpdatePopover && !dshUpdatePopover.isDestroyed() && dshPopoverSignature === signature) {
    positionDshUpdatePopover()
    dshUpdatePopover.showInactive()
    return
  }
  if (dshUpdatePopover && !dshUpdatePopover.isDestroyed()) dshUpdatePopover.close()
  const copy = mainCopy(snapshot.locale)
  const title = escapePopoverHtml(copy.dshWindowUpdateTag(snapshot.latestVersion))
  const action = escapePopoverHtml(copy.dshPopoverUpdateAction)
  const window = new BrowserWindow({
    parent: dshWindow,
    width: 282,
    height: 76,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    transparent: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  })
  dshUpdatePopover = window
  dshPopoverSignature = signature
  window.on('closed', () => {
    if (dshUpdatePopover === window) {
      dshUpdatePopover = null
      dshPopoverSignature = null
    }
  })
  window.webContents.on('will-navigate', (event, rawUrl) => {
    let actionName = ''
    try { actionName = new URL(rawUrl).hostname } catch { return }
    if (!['open-update', 'dismiss-update'].includes(actionName)) return
    event.preventDefault()
    if (actionName === 'dismiss-update') {
      dismissedDshPopoverVersion = snapshot.latestVersion
      hideDshUpdatePopover()
      return
    }
    hideDshUpdatePopover()
    showManagerWindow()
  })
  window.once('ready-to-show', () => {
    positionDshUpdatePopover()
    window.showInactive()
  })
  const html = `<!doctype html><html lang="${snapshot.locale === 'zh-CN' ? 'zh-CN' : 'en'}"><head><meta charset="utf-8"><style>html,body{margin:0;background:transparent;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}body{padding:8px}.card{box-sizing:border-box;height:60px;border:1px solid #d9dde3;border-radius:10px;background:#fff;box-shadow:0 6px 18px rgba(20,28,38,.12);color:#20242b;padding:0 43px 0 14px;display:flex;align-items:center;gap:10px;position:relative}.dot{width:7px;height:7px;flex:0 0 auto;border-radius:50%;background:#3b82f6}.title{font-size:13px;font-weight:600;line-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.action{flex:0 0 auto;border-radius:6px;background:#2563eb;color:#fff;padding:5px 9px;font-size:12px;font-weight:650;line-height:16px;text-decoration:none}.action:hover{background:#1d4ed8}.close{position:absolute;right:10px;top:18px;width:18px;height:18px;border-radius:5px;color:#8b949e;text-align:center;line-height:16px;font-size:18px;text-decoration:none}.close:hover{background:#f1f3f5;color:#30363d}</style></head><body><div class="card"><span class="dot"></span><div class="title">${title}</div><a class="action" href="dsh-update://open-update">${action}</a><a class="close" href="dsh-update://dismiss-update" aria-label="Close">×</a></div></body></html>`
  void window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
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
  const quickUpdateInDsh: Electron.MenuItemConstructorOptions = {
    id: 'quick-update-dsh',
    label: copy.versionManager,
    enabled: false,
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
      submenu: [about, { type: 'separator' as const }, quickUpdateInDsh, openVersions, checkUpdates, languageMenu(copy), { type: 'separator' as const }, { role: 'hide' as const, label: copy.hide }, { role: 'hideOthers' as const, label: copy.hideOthers }, { type: 'separator' as const }, { role: 'quit' as const, label: copy.quit }]
    }] : [{ label: 'DSH Desktop', submenu: [about, { type: 'separator' as const }, quickUpdateInDsh, openVersions, checkUpdates, languageMenu(copy), { type: 'separator' as const }, { role: 'quit' as const, label: copy.quit }] }]),
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

async function notifyDesktopUpdate(snapshot: AppUpdateSnapshot): Promise<void> {
  if (snapshot.status !== 'available' || !snapshot.availableVersion || notifiedDesktopVersion === snapshot.availableVersion) return
  notifiedDesktopVersion = snapshot.availableVersion
  const copy = mainCopy(activeLocale)
  const confirm = await dialog.showMessageBox({
    type: 'info',
    title: copy.desktopUpdateTitle(snapshot.availableVersion),
    message: snapshot.delivery === 'manual'
      ? copy.desktopUpdatePromptManual(snapshot.availableVersion)
      : copy.desktopUpdatePromptAuto(snapshot.availableVersion),
    detail: copy.desktopUpdateBody,
    buttons: [copy.promptUpdateNow, copy.promptUpdateLater],
    defaultId: 0,
    cancelId: 1,
    noLink: true
  })
  if (confirm.response !== 0) return
  if (snapshot.delivery === 'manual') {
    await shell.openExternal(RELEASE_DOWNLOAD_URL)
    return
  }
  if (!desktopUpdater) return
  const downloaded = await desktopUpdater.download()
  if (downloaded.status !== 'downloaded') return
  if (controller?.isRuntimeActive()) await controller.stop()
  desktopUpdater.install()
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
    title: latestSnapshotForWindowTitle ? dshWindowTitle(latestSnapshotForWindowTitle) : DEEPSEEK_HARNESS_WINDOW_TITLE,
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
  window.webContents.on('did-finish-load', () => {
    if (latestSnapshotForWindowTitle) setDshWindowTitle(latestSnapshotForWindowTitle)
    if (process.env.DSH_OPEN_DEVTOOLS === '1') {
      window.webContents.openDevTools({ mode: 'right' })
    }
  })
  window.webContents.on('page-title-updated', (event) => {
    event.preventDefault()
    if (latestSnapshotForWindowTitle) setDshWindowTitle(latestSnapshotForWindowTitle)
    else window.setTitle(DEEPSEEK_HARNESS_WINDOW_TITLE)
  })
  window.on('focus', () => {
    if (latestSnapshotForWindowTitle) setDshWindowTitle(latestSnapshotForWindowTitle)
  })
  window.on('move', positionDshUpdatePopover)
  window.on('resize', positionDshUpdatePopover)
  window.on('minimize', hideDshUpdatePopover)
  window.on('restore', () => {
    if (latestSnapshotForWindowTitle) showDshUpdatePopover(latestSnapshotForWindowTitle)
  })
  window.on('closed', () => {
    if (dshUpdatePopover && !dshUpdatePopover.isDestroyed()) dshUpdatePopover.close()
    dshWindow = null
    if (controller?.isRuntimeActive()) void controller.stop()
  })
  await window.loadURL(rawUrl)
  if (latestSnapshotForWindowTitle) {
    setDshWindowTitle(latestSnapshotForWindowTitle)
    showDshUpdatePopover(latestSnapshotForWindowTitle)
  }
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
  const currentAppVersion = TEST_CURRENT_VERSION && semver.valid(TEST_CURRENT_VERSION) ? TEST_CURRENT_VERSION : app.getVersion()
  const updateSupported = app.isPackaged || TEST_ENABLE_UPDATE === '1'
  controller = new AppController(currentAppVersion, store, new DshRegistry(net.fetch as typeof fetch), versions, supervisor, runtime, normalizeSystemLocale(app.getLocale()))
  desktopUpdater = new DesktopUpdater(
    electronUpdater.autoUpdater,
    currentAppVersion,
    updateSupported,
    process.platform === 'darwin' ? 'manual' : 'automatic',
    async () => { await shell.openExternal(RELEASE_DOWNLOAD_URL) },
    process.platform === 'darwin' ? checkLatestManualRelease : undefined
  )
  desktopUpdater.on('changed', (snapshot: AppUpdateSnapshot) => {
    sendToManager(channels.appUpdateChanged, snapshot)
    if (snapshot.status === 'available') void notifyDesktopUpdate(snapshot)
  })
  controller.on('snapshot', (snapshot: AppSnapshot) => {
    latestSnapshotForWindowTitle = snapshot
    if (snapshot.locale !== activeLocale || snapshot.localePreference !== activeLocalePreference) {
      activeLocale = snapshot.locale
      activeLocalePreference = snapshot.localePreference
      installApplicationMenu()
      updateAboutPanel()
    }
    setDshWindowTitle(snapshot)
    showDshUpdatePopover(snapshot)
    sendToManager(channels.stateChanged, snapshot)
    updateMenuDshUpdateHint(snapshot)
    if (['idle', 'failed'].includes(snapshot.runtimeStatus) && dshWindow && !dshWindow.isDestroyed()) dshWindow.close()
  })
  controller.on('progress', (progress: InstallProgress) => sendToManager(channels.installProgress, progress))
  registerIpc(controller)
  const initialSnapshot = await controller.initialize()
  activeLocale = initialSnapshot.locale
  activeLocalePreference = initialSnapshot.localePreference
  installApplicationMenu()
  updateAboutPanel()
  const refreshed = await controller.refresh()
  latestSnapshotForWindowTitle = refreshed
  notifyDshUpdate(refreshed)
  await openPrimaryWindow()
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
    desktopUpdateBody: 'A new version is available.',
    desktopUpdatePromptAuto: (version: string) => `Version ${version} is available. Update now to download and install automatically?`,
    desktopUpdatePromptManual: (version: string) => `Version ${version} is available. Open GitHub Releases to download it manually.`,
    promptUpdateNow: 'Update now',
    promptUpdateLater: 'Later',
    dshUpdateTitle: (version: string) => `DSH ${version} is available`,
    dshUpdateBody: (version: string) => `You are still using ${version}. Click to open Version Manager.`,
    dshWindowUpdateTag: (version: string) => `Update Available: v${version}`,
    openDshUpdateManager: (version: string) => `Update to v${version}`,
    dshPopoverUpdateAction: 'Update'
  }
  return {
    versionManager: '版本管理…', about: '关于 DSH Desktop', checkUpdates: '检查 DSH Desktop 更新…',
    language: '语言', edit: '编辑', window: '窗口', hide: '隐藏 DSH Desktop', hideOthers: '隐藏其他应用', quit: '退出 DSH Desktop',
    undo: '撤销', redo: '重做', cut: '剪切', copy: '复制', paste: '粘贴', selectAll: '全选', minimize: '最小化', zoom: '缩放',
    version: (version: string) => `版本 ${version}`,
    credits: 'DeepSeek Harness 社区桌面客户端',
    desktopUpdateTitle: (version: string) => `DSH Desktop ${version} 可以更新`,
    desktopUpdateBody: '已检测到新版本。',
    desktopUpdatePromptAuto: (version: string) => `发现新版本 ${version}，是否立即下载并安装？`,
    desktopUpdatePromptManual: (version: string) => `发现新版本 ${version}，点击前往 GitHub Releases 手动下载。`,
    promptUpdateNow: '立即更新',
    promptUpdateLater: '稍后',
    dshUpdateTitle: (version: string) => `DSH ${version} 可以安装`,
    dshUpdateBody: (version: string) => `当前继续使用 ${version}。点击打开版本管理。`,
    dshWindowUpdateTag: (version: string) => `发现更新: v${version}`,
    openDshUpdateManager: (version: string) => `更新到 v${version}`,
    dshPopoverUpdateAction: '更新'
  }
}
