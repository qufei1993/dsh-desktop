import { contextBridge, ipcRenderer } from 'electron'
import { channels } from '../shared/ipc-channels'
import type { AppSnapshot, DesktopApi, InstallProgress } from '../shared/contracts'

const api: DesktopApi = {
  getSnapshot: () => ipcRenderer.invoke(channels.snapshot),
  refresh: () => ipcRenderer.invoke(channels.refresh),
  install: (version) => ipcRenderer.invoke(channels.install, version),
  select: (version) => ipcRenderer.invoke(channels.select, version),
  launch: () => ipcRenderer.invoke(channels.launch),
  stop: () => ipcRenderer.invoke(channels.stop),
  dismissUpdate: (version) => ipcRenderer.invoke(channels.dismissUpdate, version),
  openExternal: (url) => ipcRenderer.invoke(channels.openExternal, url),
  onStateChanged: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, snapshot: AppSnapshot): void => listener(snapshot)
    ipcRenderer.on(channels.stateChanged, handler)
    return () => ipcRenderer.removeListener(channels.stateChanged, handler)
  },
  onInstallProgress: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: InstallProgress): void => listener(progress)
    ipcRenderer.on(channels.installProgress, handler)
    return () => ipcRenderer.removeListener(channels.installProgress, handler)
  }
}

contextBridge.exposeInMainWorld('dshDesktop', api)
