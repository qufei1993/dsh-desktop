import { lstat, readdir, rm } from 'node:fs/promises'
import path from 'node:path'

export type ReleasePlatform = 'darwin' | 'win32'
export type ReleaseArch = 'arm64' | 'x64'

export interface PruneResult {
  removedBytes: number
  removedFiles: number
  removedPrebuilds: string[]
}

const knownNodePtyPrebuild = /^(darwin|win32)-(arm64|x64)$/

async function measure(target: string): Promise<{ bytes: number; files: number }> {
  const info = await lstat(target)
  if (!info.isDirectory()) return { bytes: info.size, files: 1 }

  let bytes = 0
  let files = 0
  for (const entry of await readdir(target)) {
    const child = await measure(path.join(target, entry))
    bytes += child.bytes
    files += child.files
  }
  return { bytes, files }
}

async function removeDebugSymbols(target: string): Promise<{ bytes: number; files: number }> {
  let bytes = 0
  let files = 0
  for (const entry of await readdir(target, { withFileTypes: true })) {
    const child = path.join(target, entry.name)
    if (entry.isDirectory()) {
      const removed = await removeDebugSymbols(child)
      bytes += removed.bytes
      files += removed.files
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdb')) {
      const info = await lstat(child)
      await rm(child)
      bytes += info.size
      files += 1
    }
  }
  return { bytes, files }
}

/**
 * Removes only native artifacts that cannot run on the release target.
 * The official DSH package and its executable source remain untouched.
 */
export async function pruneBundledResources(
  dshRoot: string,
  platform: ReleasePlatform,
  arch: ReleaseArch
): Promise<PruneResult> {
  const desiredPrebuild = `${platform}-${arch}`
  const prebuildRoot = path.join(dshRoot, 'node_modules', 'node-pty', 'prebuilds')
  const prebuilds = await readdir(prebuildRoot, { withFileTypes: true })

  if (!prebuilds.some((entry) => entry.isDirectory() && entry.name === desiredPrebuild)) {
    throw new Error(`node-pty 缺少目标平台预编译文件: ${desiredPrebuild}`)
  }

  let removedBytes = 0
  let removedFiles = 0
  const removedPrebuilds: string[] = []
  for (const entry of prebuilds) {
    if (!entry.isDirectory() || !knownNodePtyPrebuild.test(entry.name) || entry.name === desiredPrebuild) continue
    const target = path.join(prebuildRoot, entry.name)
    const measured = await measure(target)
    await rm(target, { recursive: true, force: true })
    removedBytes += measured.bytes
    removedFiles += measured.files
    removedPrebuilds.push(entry.name)
  }

  const symbols = await removeDebugSymbols(dshRoot)
  removedBytes += symbols.bytes
  removedFiles += symbols.files

  return { removedBytes, removedFiles, removedPrebuilds: removedPrebuilds.sort() }
}
