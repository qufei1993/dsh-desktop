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
  const dshWindow = await electronApp.firstWindow({ timeout: 45_000 })
  await dshWindow.waitForLoadState('domcontentloaded')
  const hasOfficialBootstrap = await dshWindow.evaluate(() => '__DSH_BOOT__' in window)
  if (!hasOfficialBootstrap) throw new Error('DSH 窗口缺少官方启动标记')
  const managerPromise = electronApp.waitForEvent('window', { timeout: 10_000 })
  await electronApp.evaluate(({ app, Menu }) => {
    if (app.name !== 'DSH Desktop') throw new Error(`应用名称不正确：${app.name}`)
    if (process.platform === 'darwin' && Menu.getApplicationMenu()?.items[0]?.label !== 'DSH Desktop') {
      throw new Error(`macOS 应用菜单名称不正确：${Menu.getApplicationMenu()?.items[0]?.label ?? 'missing'}`)
    }
    if (!Menu.getApplicationMenu()?.getMenuItemById('about-dsh-desktop')) throw new Error('关于菜单不存在')
    if (!Menu.getApplicationMenu()?.getMenuItemById('check-for-updates')) throw new Error('应用更新菜单不存在')
    const item = Menu.getApplicationMenu()?.getMenuItemById('version-manager')
    if (!item?.click) throw new Error('版本管理菜单不存在')
    if (!item.icon || (typeof item.icon !== 'string' && item.icon.isEmpty())) throw new Error('版本管理菜单图标不存在')
    item.click(item, undefined, undefined)
  })
  const manager = await managerPromise
  await manager.getByRole('heading', { name: /版本管理|Version Manager/ }).waitFor()
  await manager.getByText('DSH 0.1.0-rc.6').waitFor()
  await manager.getByRole('button', { name: /全部版本|All versions/ }).waitFor()
  await manager.getByText(/npm 官方源|Official npm registry/).waitFor()
  await manager.getByText('v0.1.0', { exact: true }).waitFor()
  await manager.getByRole('button', { name: /在 GitHub 查看并 Star 项目|View on GitHub and star the project/ }).waitFor()
  const languageSwitch = manager.getByRole('button', { name: /切换为英文|切换为中文/ })
  await languageSwitch.waitFor()
  const initialSwitchLabel = await languageSwitch.getAttribute('aria-label')
  await languageSwitch.click()
  if (initialSwitchLabel === '切换为英文') {
    await manager.getByRole('heading', { name: 'Version Manager' }).waitFor()
    await manager.getByRole('button', { name: '切换为中文' }).click()
    await manager.getByRole('heading', { name: '版本管理' }).waitFor()
  } else {
    await manager.getByRole('heading', { name: '版本管理' }).waitFor()
    await manager.getByRole('button', { name: '切换为英文' }).click()
    await manager.getByRole('heading', { name: 'Version Manager' }).waitFor()
  }
  if (process.env.DSH_DESKTOP_E2E_SCREENSHOT) {
    await manager.getByText('0.0.1-rc.1', { exact: true }).waitFor({ timeout: 20_000 })
    await manager.screenshot({ path: process.env.DSH_DESKTOP_E2E_SCREENSHOT, fullPage: true })
  }
  await dshWindow.close()
  await manager.getByText(/未运行|Not running/, { exact: true }).waitFor({ timeout: 10_000 })
  console.log('Packaged E2E passed: direct official DSH launch, version menu, manager UI, and stop-on-close')
} finally {
  await electronApp.close()
  await rm(isolatedHome, { recursive: true, force: true })
}
