import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import semver from 'semver'
import type { AppSnapshot, InstallProgress } from '../shared/contracts'
import './style.css'

const empty: AppSnapshot = {
  appVersion: '0.1.0', nodeVersion: null, latestVersion: null, selectedVersion: null,
  dismissedLatest: null, installedVersions: [], runtimeStatus: 'idle', runtimeUrl: null, error: null
}

function App(): React.JSX.Element {
  const [snapshot, setSnapshot] = useState(empty)
  const [progress, setProgress] = useState<InstallProgress | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('正在读取本机状态…')

  useEffect(() => {
    void window.dshDesktop.getSnapshot().then((value) => { setSnapshot(value); setMessage('准备就绪') })
    const removeState = window.dshDesktop.onStateChanged(setSnapshot)
    const removeProgress = window.dshDesktop.onInstallProgress((value) => { setProgress(value); setMessage(value.message) })
    return () => { removeState(); removeProgress() }
  }, [])

  const updateAvailable = useMemo(() => Boolean(
    snapshot.latestVersion && snapshot.selectedVersion &&
    semver.gt(snapshot.latestVersion, snapshot.selectedVersion) &&
    snapshot.dismissedLatest !== snapshot.latestVersion
  ), [snapshot])

  const perform = async (label: string, action: () => Promise<AppSnapshot>): Promise<void> => {
    setBusy(true); setMessage(label)
    try { setSnapshot(await action()); setMessage('操作完成') }
    catch (error) { setMessage(error instanceof Error ? error.message : '操作失败') }
    finally { setBusy(false) }
  }

  const running = snapshot.runtimeStatus === 'running' || snapshot.runtimeStatus === 'starting'

  return <main>
    <header>
      <div className="mark">DSH</div>
      <div><h1>DSH Desktop</h1><p>官方 DeepSeek Harness 的轻量桌面入口</p></div>
      <span className={`status status-${snapshot.runtimeStatus}`}>{statusText(snapshot.runtimeStatus)}</span>
    </header>

    {updateAvailable && snapshot.latestVersion && <section className="notice">
      <div><strong>官方 DSH 有新版本 {snapshot.latestVersion}</strong><span>当前版本不会被自动替换，你可以稍后再升级。</span></div>
      <div className="actions">
        <button className="quiet" disabled={busy} onClick={() => void perform('已忽略本次提示', () => window.dshDesktop.dismissUpdate(snapshot.latestVersion!))}>暂不升级</button>
        <button disabled={busy} onClick={() => void perform('正在安装新版本…', () => window.dshDesktop.install(snapshot.latestVersion!))}>安装并选择</button>
      </div>
    </section>}

    <section className="hero">
      <div><span className="eyebrow">当前选择</span><h2>{snapshot.selectedVersion ? `DSH ${snapshot.selectedVersion}` : '尚未安装 DSH'}</h2>
        <p>DSH Desktop 只负责运行官方程序。模型、密钥、对话和扩展仍由官方 DSH 管理。</p></div>
      <button className={running ? 'danger' : 'primary'} disabled={busy || (!running && !snapshot.selectedVersion)}
        onClick={() => void perform(running ? '正在停止…' : '正在启动官方 DSH…', running ? window.dshDesktop.stop : window.dshDesktop.launch)}>
        {running ? '停止 DSH' : '打开 DSH'}
      </button>
    </section>

    <section className="panel">
      <div className="panel-title"><div><span className="eyebrow">版本库</span><h3>已安装版本</h3></div>
        <button className="quiet" disabled={busy} onClick={() => void perform('正在检查官方版本…', window.dshDesktop.refresh)}>检查更新</button></div>
      {snapshot.installedVersions.length === 0 ? <div className="empty">
        <p>还没有可用版本。</p>
        {snapshot.latestVersion && <button disabled={busy} onClick={() => void perform('正在安装官方 DSH…', () => window.dshDesktop.install(snapshot.latestVersion!))}>安装官方最新版 {snapshot.latestVersion}</button>}
      </div> : <div className="versions">{snapshot.installedVersions.map((item) => <button
        key={`${item.source}-${item.version}`} className={`version ${snapshot.selectedVersion === item.version ? 'selected' : ''}`}
        disabled={busy || running} onClick={() => void perform(`正在切换到 ${item.version}…`, () => window.dshDesktop.select(item.version))}>
        <span><strong>{item.version}</strong><small>{item.source === 'bundled' ? '随应用提供' : '后来安装'}</small></span>
        <span>{snapshot.selectedVersion === item.version ? '当前' : '选择'}</span>
      </button>)}</div>}
    </section>

    <footer>
      <span>{progress?.phase === 'downloading' ? '● ' : ''}{snapshot.error ?? message}</span>
      <span>Desktop {snapshot.appVersion} · Node {snapshot.nodeVersion ?? '未知'}</span>
    </footer>
  </main>
}

function statusText(status: AppSnapshot['runtimeStatus']): string {
  return ({ idle: '未运行', starting: '启动中', running: '运行中', stopping: '停止中', failed: '运行异常' })[status]
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
