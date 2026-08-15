import { mkdtemp, readdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from 'playwright-core'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function findExecutable(directory: string): Promise<string | null> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (process.platform === 'darwin' && target.endsWith(path.join('DSH Desktop.app'))) {
      return path.join(target, 'Contents', 'MacOS', 'DSH Desktop')
    }
    if (process.platform === 'win32' && entry.isFile() && entry.name === 'DSH Desktop.exe') return target
    if (entry.isDirectory()) {
      const found = await findExecutable(target)
      if (found) return found
    }
  }
  return null
}

const executablePath = await findExecutable(path.join(root, 'release'))
if (!executablePath) throw new Error('release 目录中没有找到已打包的 DSH Desktop')
const isolatedHome = await mkdtemp(path.join(os.tmpdir(), 'dsh-desktop-e2e-'))
const electronApp = await electron.launch({
  executablePath,
  args: [`--user-data-dir=${path.join(isolatedHome, 'electron')}`],
  env: { ...process.env, DSH_HOME: path.join(isolatedHome, 'official-dsh') }
})

try {
  const manager = await electronApp.firstWindow()
  await manager.getByRole('heading', { name: 'DSH Desktop' }).waitFor()
  await manager.getByText('DSH 0.1.0-rc.6').waitFor()
  const dshWindowPromise = electronApp.waitForEvent('window', { timeout: 45_000 })
  await manager.getByRole('button', { name: '打开 DSH' }).click()
  const dshWindow = await dshWindowPromise
  await dshWindow.waitForLoadState('domcontentloaded')
  const hasOfficialBootstrap = await dshWindow.evaluate(() => '__DSH_BOOT__' in window)
  if (!hasOfficialBootstrap) throw new Error('DSH 窗口缺少官方启动标记')
  await dshWindow.close()
  await manager.getByText('未运行', { exact: true }).waitFor({ timeout: 10_000 })
  console.log('Packaged E2E passed: manager UI, bundled version, official DSH window, and stop-on-close')
} finally {
  await electronApp.close()
  await rm(isolatedHome, { recursive: true, force: true })
}
