import semver from 'semver'
import { exactVersionSchema, officialPackageName } from '../shared/contracts'

interface RegistryDocument {
  versions?: Record<string, unknown>
  time?: Record<string, string>
}

const registryUrl = `https://registry.npmjs.org/${encodeURIComponent(officialPackageName)}`

export class DshRegistry {
  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async catalog(): Promise<{ latest: string; versions: Array<{ version: string; publishedAt: string | null }> }> {
    const response = await this.fetcher(registryUrl, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(15_000)
    })
    if (!response.ok) throw new Error(`无法查询官方 DSH 版本（HTTP ${response.status}）`)
    const data = await response.json() as RegistryDocument
    const versionNames = Object.keys(data.versions ?? {}).filter((value) => exactVersionSchema.safeParse(value).success)
    const latest = semver.rsort([...versionNames])[0]
    if (!latest) throw new Error('npm registry 未返回有效版本')
    const versions = versionNames.map((version) => ({
      version,
      publishedAt: data.time?.[version] ?? null
    }))
    return { latest, versions }
  }
}
