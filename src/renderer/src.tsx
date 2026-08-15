import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import semver from 'semver'
import type { AppSnapshot, InstallProgress } from '../shared/contracts'
import deepSeekWhale from './deepseek-whale.svg'
import './style.css'

const empty: AppSnapshot = {
  appVersion: '0.1.0', nodeVersion: null, latestVersion: null, selectedVersion: null,
  dismissedLatest: null, installedVersions: [], availableVersions: [], runtimeStatus: 'idle', runtimeUrl: null, error: null
}

type VersionFilter = 'all' | 'installed' | 'available'
interface VersionRow { version: string; publishedAt: string | null; source: 'bundled' | 'installed' | null; installed: boolean }

function App(): React.JSX.Element {
  const [snapshot, setSnapshot] = useState(empty)
  const [filter, setFilter] = useState<VersionFilter>('all')
  const [query, setQuery] = useState('')
  const [showPrerelease, setShowPrerelease] = useState(true)
  const [progress, setProgress] = useState<InstallProgress | null>(null)
  const [busyAction, setBusyAction] = useState<string | null>('initializing')
  const [message, setMessage] = useState('正在读取本机状态…')

  useEffect(() => {
    void window.dshDesktop.getSnapshot().then((value) => { setSnapshot(value); setMessage('准备就绪'); setBusyAction(null) })
    const removeState = window.dshDesktop.onStateChanged(setSnapshot)
    const removeProgress = window.dshDesktop.onInstallProgress((value) => { setProgress(value); setMessage(value.message) })
    return () => { removeState(); removeProgress() }
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
    try { setSnapshot(await action()); setMessage('操作完成') }
    catch (error) { setMessage(error instanceof Error ? error.message : '操作失败') }
    finally { setBusyAction(null) }
  }

  const running = snapshot.runtimeStatus === 'running' || snapshot.runtimeStatus === 'starting'
  const currentInstalled = snapshot.installedVersions.find((item) => item.version === snapshot.selectedVersion)
  const updateAvailable = Boolean(snapshot.latestVersion && snapshot.selectedVersion && semver.gt(snapshot.latestVersion, snapshot.selectedVersion))

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand-mark" aria-hidden="true"><img src={deepSeekWhale} alt="" /></div>
      <div className="brand-copy"><h1>版本管理</h1><p>DeepSeek Harness 社区桌面壳</p></div>
      <span className={`runtime-pill runtime-${snapshot.runtimeStatus}`}><i />{statusText(snapshot.runtimeStatus)}</span>
    </header>

    <section className="current-card" aria-label="当前 DSH 版本">
      <div className="current-orbit" aria-hidden="true"><img src={deepSeekWhale} alt="" /></div>
      <div className="current-copy">
        <span className="overline">当前使用</span>
        <div className="current-title">
          <h2>{snapshot.selectedVersion ? `DSH ${snapshot.selectedVersion}` : '尚未安装 DSH'}</h2>
          {snapshot.selectedVersion && <span className="tag tag-current">当前</span>}
          {currentInstalled?.source === 'bundled' && <span className="tag">随应用提供</span>}
          {updateAvailable && <span className="tag tag-update">可更新</span>}
        </div>
        <p>由 DSH Desktop 启动，官方功能和数据保持原样。</p>
      </div>
      <div className="current-actions">
        {running && <button className="button secondary" disabled={busyAction !== null} onClick={() => void perform('stop', '正在停止 DSH…', window.dshDesktop.stop)}>停止</button>}
        <button className="button primary" disabled={busyAction !== null || !snapshot.selectedVersion} onClick={() => void perform('launch', running ? '正在打开 DSH…' : '正在启动 DSH…', window.dshDesktop.launch)}>
          <OpenIcon />{running ? '打开 DSH' : '启动 DSH'}
        </button>
      </div>
    </section>

    <section className="library">
      <aside className="sidebar" aria-label="版本筛选">
        <div className="side-heading">版本</div>
        <nav>
          <FilterButton active={filter === 'all'} label="全部版本" count={counts.all} icon={<GridIcon />} onClick={() => setFilter('all')} />
          <FilterButton active={filter === 'installed'} label="已安装" count={counts.installed} icon={<CheckIcon />} onClick={() => setFilter('installed')} />
          <FilterButton active={filter === 'available'} label="可安装" count={counts.available} icon={<DownloadIcon />} onClick={() => setFilter('available')} />
        </nav>
        <div className="source-block">
          <span className="side-heading">版本来源</span>
          <div className="source-row"><NpmIcon /><span><strong>npm 官方源</strong><small>@deepseek-ai/dsh</small></span></div>
        </div>
        <div className="boundary-note"><ShieldIcon /><span>仅安装并运行<br />官方 DSH 包</span></div>
      </aside>

      <div className="version-content">
        <div className="toolbar">
          <label className="search"><SearchIcon /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索版本号" aria-label="搜索版本号" /></label>
          <label className="toggle-label"><input type="checkbox" checked={showPrerelease} onChange={(event) => setShowPrerelease(event.target.checked)} /><span className="toggle" />显示预发布版本</label>
          <button className="icon-button" title="刷新官方版本" aria-label="刷新官方版本" disabled={busyAction !== null} onClick={() => void perform('refresh', '正在同步 npm 官方版本…', window.dshDesktop.refresh)}><RefreshIcon /></button>
        </div>

        <div className="list-heading"><span>{filterLabel(filter)}</span><small>{visibleRows.length} 个版本</small></div>
        <div className="version-list" aria-live="polite">
          {visibleRows.map((item) => {
            const current = snapshot.selectedVersion === item.version
            const actionKey = `${item.installed ? 'switch' : 'install'}:${item.version}`
            return <article className={`version-row ${current ? 'is-current' : ''}`} key={item.version}>
              <div className="version-node" aria-hidden="true"><span /></div>
              <div className="version-info">
                <div className="version-name"><strong>{item.version}</strong>{current && <span className="tag tag-current">当前</span>}{item.installed && <span className="tag">已安装</span>}{snapshot.latestVersion === item.version && <span className="tag tag-latest">最新</span>}</div>
                <p>{formatDate(item.publishedAt)} · 官方 npm</p>
              </div>
              {current
                ? <button className="button row-action current-action" disabled><CheckIcon />使用中</button>
                : item.installed
                  ? <button className="button row-action secondary" disabled={busyAction !== null} onClick={() => void perform(actionKey, `正在切换到 ${item.version}…`, () => window.dshDesktop.select(item.version))}>{busyAction === actionKey ? '切换中…' : '切换'}</button>
                  : <button className="button row-action install" disabled={busyAction !== null} onClick={() => void perform(actionKey, `正在安装 ${item.version}…`, () => window.dshDesktop.install(item.version))}><DownloadIcon />{busyAction === actionKey ? '安装中…' : '安装'}</button>}
            </article>
          })}
          {visibleRows.length === 0 && <div className="empty-state"><span>⌕</span><strong>没有符合条件的版本</strong><p>{snapshot.availableVersions.length === 0 ? '点击右上角刷新，从 npm 官方源获取版本。' : '试试调整筛选或搜索内容。'}</p></div>}
        </div>
      </div>
    </section>

    <footer className="footer">
      <span className={snapshot.error ? 'error-message' : ''}>{progress?.phase === 'downloading' && busyAction?.startsWith('install') ? '● ' : ''}{snapshot.error ?? message}</span>
      <span>Desktop {snapshot.appVersion} · Node {snapshot.nodeVersion ?? '未知'}</span>
    </footer>
  </main>
}

function FilterButton({ active, label, count, icon, onClick }: { active: boolean; label: string; count: number; icon: React.ReactNode; onClick: () => void }): React.JSX.Element {
  return <button className={`filter-button ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span><b>{count}</b></button>
}
function filterLabel(filter: VersionFilter): string { return ({ all: '全部版本', installed: '已安装版本', available: '可安装版本' })[filter] }
function formatDate(value: string | null): string {
  if (!value) return '发布时间未知'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '发布时间未知' : new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' }).format(date)
}
function statusText(status: AppSnapshot['runtimeStatus']): string { return ({ idle: '未运行', starting: '启动中', running: 'DSH 运行中', stopping: '停止中', failed: '运行异常' })[status] }

const Svg = ({ children }: { children: React.ReactNode }): React.JSX.Element => <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
const GridIcon = (): React.JSX.Element => <Svg><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></Svg>
const CheckIcon = (): React.JSX.Element => <Svg><path d="m5 12 4 4L19 6"/></Svg>
const DownloadIcon = (): React.JSX.Element => <Svg><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14"/></Svg>
const SearchIcon = (): React.JSX.Element => <Svg><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></Svg>
const RefreshIcon = (): React.JSX.Element => <Svg><path d="M20 7v5h-5M4 17v-5h5"/><path d="M18.1 9A7 7 0 0 0 6 6.5L4 12m16 0-2 5.5A7 7 0 0 1 5.9 15"/></Svg>
const OpenIcon = (): React.JSX.Element => <Svg><path d="M14 4h6v6m0-6-9 9"/><path d="M19 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/></Svg>
const ShieldIcon = (): React.JSX.Element => <Svg><path d="M12 3 5 6v5c0 4.5 2.8 7.8 7 10 4.2-2.2 7-5.5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></Svg>
const NpmIcon = (): React.JSX.Element => <svg viewBox="0 0 36 14" aria-hidden="true"><path fill="currentColor" d="M0 0h36v12H18v2h-8v-2H0V0Zm2 2v8h4V4h2v6h4V2H2Zm12 0v10h4v-2h6V2H14Zm4 2h2v4h-2V4Zm8-2v8h4V4h2v6h2V2h-8Z"/></svg>

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
