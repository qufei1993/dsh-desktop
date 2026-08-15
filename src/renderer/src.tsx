import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import semver from 'semver'
import type { AppLocale, AppSnapshot, AppUpdateSnapshot, InstallProgress, LocalePreference } from '../shared/contracts'
import deepSeekWhale from './deepseek-whale.svg'
import './style.css'

const initialLocale: AppLocale = navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US'
const empty: AppSnapshot = {
  appVersion: '0.1.0', nodeVersion: null, latestVersion: null, selectedVersion: null,
  locale: initialLocale, localePreference: 'system', dismissedLatest: null, installedVersions: [], availableVersions: [], runtimeStatus: 'idle', runtimeUrl: null, error: null
}
const emptyAppUpdate: AppUpdateSnapshot = {
  currentVersion: '0.1.0', availableVersion: null, status: 'idle', percent: null, message: null
}
const repositoryUrl = 'https://github.com/qufei1993/dsh-desktop'

type VersionFilter = 'all' | 'installed' | 'available'
interface VersionRow { version: string; publishedAt: string | null; source: 'bundled' | 'installed' | null; installed: boolean }

function App(): React.JSX.Element {
  const [snapshot, setSnapshot] = useState(empty)
  const [filter, setFilter] = useState<VersionFilter>('all')
  const [query, setQuery] = useState('')
  const [showPrerelease, setShowPrerelease] = useState(true)
  const [progress, setProgress] = useState<InstallProgress | null>(null)
  const [appUpdate, setAppUpdate] = useState(emptyAppUpdate)
  const [busyAction, setBusyAction] = useState<string | null>('initializing')
  const [message, setMessage] = useState(copy(initialLocale).readingState)
  const language = copy(snapshot.locale)

  useEffect(() => {
    void window.dshDesktop.getSnapshot().then((value) => { setSnapshot(value); document.documentElement.lang = value.locale; setMessage(copy(value.locale).ready); setBusyAction(null) })
    void window.dshDesktop.getAppUpdate().then(setAppUpdate)
    const removeState = window.dshDesktop.onStateChanged(setSnapshot)
    const removeProgress = window.dshDesktop.onInstallProgress((value) => { setProgress(value); setMessage(value.message) })
    const removeAppUpdate = window.dshDesktop.onAppUpdateChanged(setAppUpdate)
    return () => { removeState(); removeProgress(); removeAppUpdate() }
  }, [])

  const rows = useMemo<VersionRow[]>(() => {
    const items = new Map<string, VersionRow>()
    for (const item of snapshot.availableVersions) items.set(item.version, { version: item.version, publishedAt: item.publishedAt, source: null, installed: false })
    for (const item of snapshot.installedVersions) {
      const existing = items.get(item.version)
      items.set(item.version, { version: item.version, publishedAt: existing?.publishedAt ?? null, source: item.source, installed: true })
    }
    return [...items.values()].sort((a, b) => semver.rcompare(a.version, b.version))
  }, [snapshot.availableVersions, snapshot.installedVersions])

  const counts = useMemo(() => ({
    all: rows.length,
    installed: rows.filter((item) => item.installed).length,
    available: rows.filter((item) => !item.installed).length
  }), [rows])

  const visibleRows = useMemo(() => rows.filter((item) => {
    if (filter === 'installed' && !item.installed) return false
    if (filter === 'available' && item.installed) return false
    if (!showPrerelease && semver.prerelease(item.version)) return false
    return item.version.toLowerCase().includes(query.trim().toLowerCase())
  }), [filter, query, rows, showPrerelease])

  const perform = async (key: string, label: string, action: () => Promise<AppSnapshot>): Promise<void> => {
    setBusyAction(key); setMessage(label)
    try { setSnapshot(await action()); setMessage(language.completed) }
    catch (error) { setMessage(localizeMessage(snapshot.locale, error instanceof Error ? error.message : language.failed)) }
    finally { setBusyAction(null) }
  }

  const running = snapshot.runtimeStatus === 'running' || snapshot.runtimeStatus === 'starting'
  const currentInstalled = snapshot.installedVersions.find((item) => item.version === snapshot.selectedVersion)
  const updateAvailable = Boolean(snapshot.latestVersion && snapshot.selectedVersion && semver.gt(snapshot.latestVersion, snapshot.selectedVersion))

  const performAppUpdate = async (): Promise<void> => {
    if (appUpdate.status === 'downloaded') {
      await window.dshDesktop.installAppUpdate()
      return
    }
    const action = appUpdate.status === 'available' ? window.dshDesktop.downloadAppUpdate : window.dshDesktop.checkAppUpdate
    try { setAppUpdate(await action()) }
    catch (error) { setAppUpdate((current) => ({ ...current, status: 'error', message: localizeMessage(snapshot.locale, error instanceof Error ? error.message : language.appUpdateFailed) })) }
  }

  const changeLocale = async (preference: LocalePreference): Promise<void> => {
    const next = await window.dshDesktop.setLocale(preference)
    setSnapshot(next)
    document.documentElement.lang = next.locale
    setMessage(copy(next.locale).ready)
  }

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand-mark" aria-hidden="true"><img src={deepSeekWhale} alt="" /></div>
      <div className="brand-copy"><h1>{language.versionManager}</h1><p>{language.communityClient}</p></div>
      <button
        type="button"
        className="language-switch"
        aria-label={snapshot.locale === 'zh-CN' ? language.switchToEnglish : language.switchToChinese}
        title={snapshot.locale === 'zh-CN' ? language.switchToEnglish : language.switchToChinese}
        onClick={() => void changeLocale(snapshot.locale === 'zh-CN' ? 'en-US' : 'zh-CN')}
      >
        {snapshot.locale === 'zh-CN' ? 'English' : '中文'}
      </button>
      <div className={`desktop-version desktop-version-${appUpdate.status}`} title={appUpdateText(appUpdate, snapshot.locale)}>
        <button
          type="button"
          className="desktop-repo-link"
          aria-label={language.starOnGitHub}
          title={language.starOnGitHub}
          onClick={() => void window.dshDesktop.openExternal(repositoryUrl)}
        >
          <strong>v{appUpdate.currentVersion}</strong>
          <StarIcon />
        </button>
        <button
          type="button"
          className="desktop-update-button"
          aria-label={appUpdateButtonText(appUpdate, snapshot.locale)}
          title={`${appUpdateButtonText(appUpdate, snapshot.locale)}: ${appUpdateText(appUpdate, snapshot.locale)}`}
          disabled={['checking', 'downloading', 'unsupported'].includes(appUpdate.status)}
          onClick={() => void performAppUpdate()}
        >
          {appUpdate.status === 'downloading'
            ? <small>{Math.round(appUpdate.percent ?? 0)}%</small>
            : appUpdate.status === 'checking'
              ? <RefreshIcon />
              : appUpdate.status === 'available'
                ? <DownloadIcon />
                : appUpdate.status === 'downloaded'
                  ? <RestartIcon />
                  : <RefreshIcon />}
        </button>
      </div>
    </header>

    <section className="current-card" aria-label={language.currentDshVersion}>
      <div className="current-orbit" aria-hidden="true"><img src={deepSeekWhale} alt="" /></div>
      <div className="current-copy">
        <span className="overline">{language.currentlyUsing}</span>
        <div className="current-title">
          <h2>{snapshot.selectedVersion ? `DSH ${snapshot.selectedVersion}` : language.dshNotInstalled}</h2>
          {snapshot.selectedVersion && <span className="tag tag-current">{language.current}</span>}
          {currentInstalled?.source === 'bundled' && <span className="tag">{language.bundled}</span>}
          {updateAvailable && <span className="tag tag-update">{language.updateAvailable}</span>}
        </div>
        <p>{language.officialFeaturesUnchanged}</p>
      </div>
      <div className="current-actions">
        <span className={`runtime-pill runtime-${snapshot.runtimeStatus}`}><i />{statusText(snapshot.runtimeStatus, snapshot.locale)}</span>
        {running && <button className="button secondary" disabled={busyAction !== null} onClick={() => void perform('stop', language.stoppingDsh, window.dshDesktop.stop)}>{language.stop}</button>}
        <button className="button primary" disabled={busyAction !== null || !snapshot.selectedVersion} onClick={() => void perform('launch', running ? language.openingDsh : language.startingDsh, window.dshDesktop.launch)}>
          <OpenIcon />{running ? language.openDsh : language.startDsh}
        </button>
      </div>
    </section>

    <section className="library">
      <aside className="sidebar" aria-label={language.versionFilters}>
        <div className="side-heading">{language.versions}</div>
        <nav>
          <FilterButton active={filter === 'all'} label={language.allVersions} count={counts.all} icon={<GridIcon />} onClick={() => setFilter('all')} />
          <FilterButton active={filter === 'installed'} label={language.installed} count={counts.installed} icon={<CheckIcon />} onClick={() => setFilter('installed')} />
          <FilterButton active={filter === 'available'} label={language.available} count={counts.available} icon={<DownloadIcon />} onClick={() => setFilter('available')} />
        </nav>
        <div className="source-block">
          <span className="side-heading">{language.versionSource}</span>
          <div className="source-row"><NpmIcon /><span><strong>{language.officialNpm}</strong><small>@deepseek-ai/dsh</small></span></div>
        </div>
        <div className="boundary-note"><ShieldIcon /><span>{language.onlyOfficialLine1}<br />{language.onlyOfficialLine2}</span></div>
      </aside>

      <div className="version-content">
        <div className="toolbar">
          <label className="search"><SearchIcon /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={language.searchVersion} aria-label={language.searchVersion} /></label>
          <label className="toggle-label"><input type="checkbox" checked={showPrerelease} onChange={(event) => setShowPrerelease(event.target.checked)} /><span className="toggle" />{language.showPrerelease}</label>
          <button className="icon-button" title={language.refreshVersions} aria-label={language.refreshVersions} disabled={busyAction !== null} onClick={() => void perform('refresh', language.syncingVersions, window.dshDesktop.refresh)}><RefreshIcon /></button>
        </div>

        <div className="list-heading"><span>{filterLabel(filter, snapshot.locale)}</span><small>{language.versionCount(visibleRows.length)}</small></div>
        <div className="version-list" aria-live="polite">
          {visibleRows.map((item) => {
            const current = snapshot.selectedVersion === item.version
            const actionKey = `${item.installed ? 'switch' : 'install'}:${item.version}`
            return <article className={`version-row ${current ? 'is-current' : ''}`} key={item.version}>
              <div className="version-node" aria-hidden="true"><span /></div>
              <div className="version-info">
                <div className="version-name"><strong>{item.version}</strong>{current && <span className="tag tag-current">{language.current}</span>}{item.installed && <span className="tag">{language.installed}</span>}{snapshot.latestVersion === item.version && <span className="tag tag-latest">{language.latest}</span>}</div>
                <p>{formatDate(item.publishedAt, snapshot.locale)} · {language.officialNpmShort}</p>
              </div>
              {current
                ? <button className="button row-action current-action" disabled><CheckIcon />{language.inUse}</button>
                : item.installed
                  ? <button className="button row-action secondary" disabled={busyAction !== null} onClick={() => void perform(actionKey, language.switchingTo(item.version), () => window.dshDesktop.select(item.version))}>{busyAction === actionKey ? language.switching : language.switch}</button>
                  : <button className="button row-action install" disabled={busyAction !== null} onClick={() => void perform(actionKey, language.installingVersion(item.version), () => window.dshDesktop.install(item.version))}><DownloadIcon />{busyAction === actionKey ? language.installing : language.install}</button>}
            </article>
          })}
          {visibleRows.length === 0 && <div className="empty-state"><span>⌕</span><strong>{language.noMatchingVersions}</strong><p>{snapshot.availableVersions.length === 0 ? language.refreshEmpty : language.adjustFilters}</p></div>}
        </div>
      </div>
    </section>

    <footer className="footer">
      <span className={snapshot.error ? 'error-message' : ''}>{progress?.phase === 'downloading' && busyAction?.startsWith('install') ? '● ' : ''}{localizeMessage(snapshot.locale, snapshot.error ?? message)}</span>
      <span>Node {snapshot.nodeVersion ?? language.unknown}</span>
    </footer>
  </main>
}

function FilterButton({ active, label, count, icon, onClick }: { active: boolean; label: string; count: number; icon: React.ReactNode; onClick: () => void }): React.JSX.Element {
  return <button className={`filter-button ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span><b>{count}</b></button>
}
function filterLabel(filter: VersionFilter, locale: AppLocale): string {
  const language = copy(locale)
  return ({ all: language.allVersions, installed: language.installedVersions, available: language.availableVersions })[filter]
}
function formatDate(value: string | null, locale: AppLocale): string {
  if (!value) return copy(locale).unknownPublishDate
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? copy(locale).unknownPublishDate : new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(date)
}
function statusText(status: AppSnapshot['runtimeStatus'], locale: AppLocale): string {
  const language = copy(locale)
  return ({ idle: language.notRunning, starting: language.starting, running: language.dshRunning, stopping: language.stopping, failed: language.runtimeError })[status]
}
function appUpdateText(update: AppUpdateSnapshot, locale: AppLocale): string {
  const language = copy(locale)
  if (update.status === 'available') return language.newDesktopVersion(update.availableVersion ?? '')
  if (update.status === 'downloading') return language.downloadingDesktop(update.availableVersion ?? language.newVersion, Math.round(update.percent ?? 0))
  if (update.status === 'downloaded') return language.desktopDownloaded(update.availableVersion ?? '')
  if (update.status === 'checking') return language.checkingGitHub
  if (update.status === 'up-to-date') return language.upToDate
  if (update.status === 'error' || update.status === 'unsupported') return localizeMessage(locale, update.message ?? language.cannotCheckUpdates)
  return language.independentUpdates
}
function appUpdateButtonText(update: AppUpdateSnapshot, locale: AppLocale): string {
  const language = copy(locale)
  if (update.status === 'available') return language.downloadUpdate
  if (update.status === 'downloading') return `${Math.round(update.percent ?? 0)}%`
  if (update.status === 'downloaded') return language.restartInstall
  if (update.status === 'checking') return language.checking
  if (update.status === 'up-to-date' || update.status === 'error') return language.checkAgain
  if (update.status === 'unsupported') return language.releaseOnly
  return language.checkUpdates
}

function localizeMessage(locale: AppLocale, message: string): string {
  if (locale === 'zh-CN') return message
  const exact: Record<string, string> = {
    '正在读取本机状态…': 'Reading local state…', '准备就绪': 'Ready', '操作完成': 'Completed', '操作失败': 'Operation failed',
    '应用更新失败': 'App update failed', '开发模式不检查应用更新': 'App updates are unavailable in development mode',
    '当前已是最新版': 'You are up to date', '更新已下载，重启后安装': 'Update downloaded. Restart to install.',
    '当前没有可下载的 DSH Desktop 更新': 'No DSH Desktop update is available to download', '更新尚未下载完成': 'The update has not finished downloading',
    '尚未发布可供自动更新的正式版本': 'No published release is currently available for automatic updates',
    '内置 Node.js 运行环境不可用': 'The bundled Node.js runtime is unavailable', '检查版本失败': 'Could not check versions',
    '已有 DSH 版本正在安装': 'Another DSH version is already being installed', '安装失败': 'Installation failed',
    '请先停止正在运行的 DSH': 'Stop the running DSH instance first', '请先安装并选择一个 DSH 版本': 'Install and select a DSH version first',
    '启动失败': 'Could not start DSH', '无法查询官方 DSH 版本': 'Could not query official DSH versions',
    'npm registry 未返回有效的 latest 版本': 'The npm registry did not return a valid latest version',
    '该版本不在官方 npm 版本目录中': 'This version is not listed in the official npm catalog',
    '正在校验官方包版本和入口': 'Validating the official package version and entry point',
    '官方 DSH 包身份或版本校验失败': 'Official DSH package identity or version validation failed',
    '官方 DSH 包未提供 dsh CLI 入口': 'The official DSH package does not provide a dsh CLI entry point',
    '官方 DSH CLI 入口无效': 'The official DSH CLI entry point is invalid',
    '命令执行超时': 'Command timed out', 'DSH 已经在运行': 'DSH is already running',
    '官方 DSH 在规定时间内未返回本地访问地址': 'Official DSH did not provide a local URL in time',
    '无法启动官方 DSH 进程': 'Could not start the official DSH process'
  }
  if (exact[message]) return exact[message]
  return message
    .replace(/^正在安装官方 DSH (.+)$/, 'Installing official DSH $1')
    .replace(/^DSH (.+) 已安装$/, 'DSH $1 installed')
    .replace(/^检查更新失败：/, 'Update check failed: ')
    .replace(/^官方 DSH 启动失败（退出码 (.+)）$/, 'Official DSH failed to start (exit code $1)')
    .replace(/^npm 安装失败（退出码 (.+)）：/, 'npm installation failed (exit code $1): ')
}

function copy(locale: AppLocale) {
  if (locale === 'en-US') return {
    readingState: 'Reading local state…', ready: 'Ready', completed: 'Completed', failed: 'Operation failed', appUpdateFailed: 'App update failed',
    versionManager: 'Version Manager', communityClient: 'DeepSeek Harness community desktop client', switchToEnglish: 'Switch to English', switchToChinese: '切换为中文', starOnGitHub: 'View on GitHub and star the project',
    currentDshVersion: 'Current DSH version', currentlyUsing: 'Currently using', dshNotInstalled: 'DSH is not installed', current: 'Current', bundled: 'Bundled', updateAvailable: 'Update available',
    officialFeaturesUnchanged: 'Launched by DSH Desktop. Official features and data remain unchanged.', stop: 'Stop', openDsh: 'Open DSH', startDsh: 'Start DSH', stoppingDsh: 'Stopping DSH…', openingDsh: 'Opening DSH…', startingDsh: 'Starting DSH…',
    versionFilters: 'Version filters', versions: 'Versions', allVersions: 'All versions', installed: 'Installed', available: 'Available', installedVersions: 'Installed versions', availableVersions: 'Available versions',
    versionSource: 'Version source', officialNpm: 'Official npm registry', officialNpmShort: 'Official npm', onlyOfficialLine1: 'Installs and runs only', onlyOfficialLine2: 'official DSH packages',
    searchVersion: 'Search versions', showPrerelease: 'Show prereleases', refreshVersions: 'Refresh official versions', syncingVersions: 'Syncing official npm versions…',
    versionCount: (count: number) => `${count} version${count === 1 ? '' : 's'}`, latest: 'Latest', inUse: 'In use', switching: 'Switching…', switch: 'Switch', installing: 'Installing…', install: 'Install',
    switchingTo: (version: string) => `Switching to ${version}…`, installingVersion: (version: string) => `Installing ${version}…`,
    noMatchingVersions: 'No matching versions', refreshEmpty: 'Refresh to load versions from the official npm registry.', adjustFilters: 'Try adjusting the filters or search.', unknown: 'Unknown', unknownPublishDate: 'Publish date unknown',
    notRunning: 'Not running', starting: 'Starting', dshRunning: 'DSH running', stopping: 'Stopping', runtimeError: 'Runtime error',
    newDesktopVersion: (version: string) => `Version ${version} is available. You decide whether to upgrade.`, newVersion: 'new version', downloadingDesktop: (version: string, percent: number) => `Downloading ${version} · ${percent}%`,
    desktopDownloaded: (version: string) => `${version} downloaded. Restart to install.`, checkingGitHub: 'Checking GitHub Releases for updates…', upToDate: 'You are up to date', cannotCheckUpdates: 'Unable to check for updates',
    independentUpdates: 'DSH Desktop updates come from GitHub Releases and are separate from official DSH versions', downloadUpdate: 'Download update', restartInstall: 'Restart and install', checking: 'Checking…', checkAgain: 'Check again', releaseOnly: 'Available in release builds only', checkUpdates: 'Check for updates'
  }
  return {
    readingState: '正在读取本机状态…', ready: '准备就绪', completed: '操作完成', failed: '操作失败', appUpdateFailed: '应用更新失败',
    versionManager: '版本管理', communityClient: 'DeepSeek Harness 社区桌面客户端', switchToEnglish: '切换为英文', switchToChinese: '切换为中文', starOnGitHub: '在 GitHub 查看并 Star 项目',
    currentDshVersion: '当前 DSH 版本', currentlyUsing: '当前使用', dshNotInstalled: '尚未安装 DSH', current: '当前', bundled: '随应用提供', updateAvailable: '可更新',
    officialFeaturesUnchanged: '由 DSH Desktop 启动，官方功能和数据保持原样。', stop: '停止', openDsh: '打开 DSH', startDsh: '启动 DSH', stoppingDsh: '正在停止 DSH…', openingDsh: '正在打开 DSH…', startingDsh: '正在启动 DSH…',
    versionFilters: '版本筛选', versions: '版本', allVersions: '全部版本', installed: '已安装', available: '可安装', installedVersions: '已安装版本', availableVersions: '可安装版本',
    versionSource: '版本来源', officialNpm: 'npm 官方源', officialNpmShort: '官方 npm', onlyOfficialLine1: '仅安装并运行', onlyOfficialLine2: '官方 DSH 包',
    searchVersion: '搜索版本号', showPrerelease: '显示预发布版本', refreshVersions: '刷新官方版本', syncingVersions: '正在同步 npm 官方版本…',
    versionCount: (count: number) => `${count} 个版本`, latest: '最新', inUse: '使用中', switching: '切换中…', switch: '切换', installing: '安装中…', install: '安装',
    switchingTo: (version: string) => `正在切换到 ${version}…`, installingVersion: (version: string) => `正在安装 ${version}…`,
    noMatchingVersions: '没有符合条件的版本', refreshEmpty: '点击右上角刷新，从 npm 官方源获取版本。', adjustFilters: '试试调整筛选或搜索内容。', unknown: '未知', unknownPublishDate: '发布时间未知',
    notRunning: '未运行', starting: '启动中', dshRunning: 'DSH 运行中', stopping: '停止中', runtimeError: '运行异常',
    newDesktopVersion: (version: string) => `发现新版 ${version}，是否升级由你决定`, newVersion: '新版', downloadingDesktop: (version: string, percent: number) => `正在下载 ${version} · ${percent}%`,
    desktopDownloaded: (version: string) => `${version} 已下载，重启后安装`, checkingGitHub: '正在从 GitHub Releases 检查更新…', upToDate: '当前已是最新版', cannotCheckUpdates: '暂时无法检查更新',
    independentUpdates: 'DSH Desktop 更新来自 GitHub Releases，与官方 DSH 版本独立', downloadUpdate: '下载更新', restartInstall: '重启并安装', checking: '检查中…', checkAgain: '再次检查', releaseOnly: '仅正式版可用', checkUpdates: '检查更新'
  }
}

const Svg = ({ children }: { children: React.ReactNode }): React.JSX.Element => <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
const GridIcon = (): React.JSX.Element => <Svg><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></Svg>
const CheckIcon = (): React.JSX.Element => <Svg><path d="m5 12 4 4L19 6"/></Svg>
const DownloadIcon = (): React.JSX.Element => <Svg><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14"/></Svg>
const SearchIcon = (): React.JSX.Element => <Svg><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></Svg>
const RefreshIcon = (): React.JSX.Element => <Svg><path d="M20 7v5h-5M4 17v-5h5"/><path d="M18.1 9A7 7 0 0 0 6 6.5L4 12m16 0-2 5.5A7 7 0 0 1 5.9 15"/></Svg>
const RestartIcon = (): React.JSX.Element => <Svg><path d="M20 6v5h-5"/><path d="M18.2 9A7.5 7.5 0 1 0 19 15"/></Svg>
const StarIcon = (): React.JSX.Element => <Svg><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/></Svg>
const OpenIcon = (): React.JSX.Element => <Svg><path d="M14 4h6v6m0-6-9 9"/><path d="M19 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/></Svg>
const ShieldIcon = (): React.JSX.Element => <Svg><path d="M12 3 5 6v5c0 4.5 2.8 7.8 7 10 4.2-2.2 7-5.5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></Svg>
const NpmIcon = (): React.JSX.Element => <svg viewBox="0 0 36 14" aria-hidden="true"><path fill="currentColor" d="M0 0h36v12H18v2h-8v-2H0V0Zm2 2v8h4V4h2v6h4V2H2Zm12 0v10h4v-2h6V2H14Zm4 2h2v4h-2V4Zm8-2v8h4V4h2v6h2V2h-8Z"/></svg>

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
