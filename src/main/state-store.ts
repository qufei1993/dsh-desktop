import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import writeFileAtomic from 'write-file-atomic'
import type { LocalePreference } from '../shared/contracts'

export interface PersistedState {
  schemaVersion: 1
  selectedVersion: string | null
  dismissedLatest: string | null
  localePreference: LocalePreference
}

const defaults: PersistedState = {
  schemaVersion: 1,
  selectedVersion: null,
  dismissedLatest: null,
  localePreference: 'system'
}

export class StateStore {
  readonly file: string

  constructor(userData: string) {
    this.file = path.join(userData, 'desktop-state.json')
  }

  async read(): Promise<PersistedState> {
    try {
      const parsed = JSON.parse(await readFile(this.file, 'utf8')) as Partial<PersistedState>
      return {
        schemaVersion: 1,
        selectedVersion: typeof parsed.selectedVersion === 'string' ? parsed.selectedVersion : null,
        dismissedLatest: typeof parsed.dismissedLatest === 'string' ? parsed.dismissedLatest : null,
        localePreference: ['system', 'zh-CN', 'en-US'].includes(parsed.localePreference ?? '') ? parsed.localePreference as LocalePreference : 'system'
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      return { ...defaults }
    }
  }

  async write(state: PersistedState): Promise<void> {
    await mkdir(path.dirname(this.file), { recursive: true })
    await writeFileAtomic(this.file, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 })
  }
}
