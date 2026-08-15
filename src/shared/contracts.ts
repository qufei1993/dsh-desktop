import { z } from 'zod'
import semver from 'semver'
export { channels } from './ipc-channels'

export const officialPackageName = '@deepseek-ai/dsh' as const
export const bundledDshVersion = '0.1.0-rc.6' as const

export const exactVersionSchema = z.string().min(1).max(80).regex(/^[0-9A-Za-z][0-9A-Za-z.+-]*$/).refine((value) => semver.valid(value) !== null)
export const localePreferenceSchema = z.enum(['system', 'zh-CN', 'en-US'])

export type AppLocale = 'zh-CN' | 'en-US'
export type LocalePreference = z.infer<typeof localePreferenceSchema>

export function resolveLocale(preference: LocalePreference, systemLocale: AppLocale): AppLocale {
  return preference === 'system' ? systemLocale : preference
}

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
  locale: AppLocale
  localePreference: LocalePreference
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

export type AppUpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'up-to-date' | 'error' | 'unsupported'

export interface AppUpdateSnapshot {
  currentVersion: string
  availableVersion: string | null
  status: AppUpdateStatus
  percent: number | null
  message: string | null
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
  setLocale(preference: LocalePreference): Promise<AppSnapshot>
  getAppUpdate(): Promise<AppUpdateSnapshot>
  checkAppUpdate(): Promise<AppUpdateSnapshot>
  downloadAppUpdate(): Promise<AppUpdateSnapshot>
  installAppUpdate(): Promise<void>
  onStateChanged(listener: (snapshot: AppSnapshot) => void): () => void
  onInstallProgress(listener: (progress: InstallProgress) => void): () => void
  onAppUpdateChanged(listener: (snapshot: AppUpdateSnapshot) => void): () => void
}
