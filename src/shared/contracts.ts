import { z } from 'zod'
import semver from 'semver'
export { channels } from './ipc-channels'

export const officialPackageName = '@deepseek-ai/dsh' as const
export const bundledDshVersion = '0.1.0-rc.6' as const

export const exactVersionSchema = z.string().min(1).max(80).regex(/^[0-9A-Za-z][0-9A-Za-z.+-]*$/).refine((value) => semver.valid(value) !== null)

export type RuntimeStatus = 'idle' | 'starting' | 'running' | 'stopping' | 'failed'

export interface InstalledVersion {
  version: string
  source: 'bundled' | 'installed'
}

export interface OfficialVersion {
  version: string
  publishedAt: string | null
}

export interface AppSnapshot {
  appVersion: string
  nodeVersion: string | null
  latestVersion: string | null
  selectedVersion: string | null
  dismissedLatest: string | null
  installedVersions: InstalledVersion[]
  availableVersions: OfficialVersion[]
  runtimeStatus: RuntimeStatus
  runtimeUrl: string | null
  error: string | null
}

export interface InstallProgress {
  version: string
  phase: 'downloading' | 'validating' | 'complete' | 'failed'
  message: string
}

export interface DesktopApi {
  getSnapshot(): Promise<AppSnapshot>
  refresh(): Promise<AppSnapshot>
  install(version: string): Promise<AppSnapshot>
  select(version: string): Promise<AppSnapshot>
  launch(): Promise<AppSnapshot>
  stop(): Promise<AppSnapshot>
  dismissUpdate(version: string): Promise<AppSnapshot>
  openExternal(url: string): Promise<void>
  onStateChanged(listener: (snapshot: AppSnapshot) => void): () => void
  onInstallProgress(listener: (progress: InstallProgress) => void): () => void
}
