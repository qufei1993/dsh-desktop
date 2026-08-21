import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
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
const resourcesPath = process.platform === 'darwin'
  ? path.resolve(executablePath, '..', '..', 'Resources')
  : path.join(path.dirname(executablePath), 'resources')
const packagedNode = process.platform === 'win32'
  ? path.join(resourcesPath, 'runtime', 'node.exe')
  : path.join(resourcesPath, 'runtime', 'bin', 'node')
const packagedNpm = process.platform === 'win32'
  ? path.join(resourcesPath, 'runtime', 'npm', 'bin', 'npm-cli.js')
  : path.join(resourcesPath, 'runtime', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js')
const packagedPnpm = path.join(resourcesPath, 'package-manager', 'pnpm', 'bin', 'pnpm.mjs')
const packagedRuntimeBin = path.join(resourcesPath, 'runtime-bin')
const packagedPnpmCommand = path.join(packagedRuntimeBin, process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm')
if (!existsSync(packagedNode) || !existsSync(packagedNpm) || !existsSync(packagedPnpm) || !existsSync(packagedPnpmCommand)) {
  throw new Error(`打包应用的运行资源不完整：node=${existsSync(packagedNode)}, npm=${existsSync(packagedNpm)}, pnpm=${existsSync(packagedPnpm)}, pnpmCommand=${existsSync(packagedPnpmCommand)}`)
}

const pathKey = Object.keys(process.env).find((key) => key.toLowerCase() === 'path') ?? 'PATH'
const packagedEnvironment = { ...process.env, [pathKey]: [packagedRuntimeBin, path.dirname(packagedNode), process.env[pathKey]].filter(Boolean).join(path.delimiter) }
const packagedPnpmVersion = await new Promise<string>((resolve, reject) => {
  const executable = process.platform === 'win32' ? 'cmd.exe' : 'pnpm'
  const args = process.platform === 'win32' ? ['/d', '/s', '/c', 'pnpm --version'] : ['--version']
  const command = spawn(executable, args, { env: packagedEnvironment, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  let stdout = ''
  let stderr = ''
  command.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
  command.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })
  command.once('error', reject)
  command.once('exit', (code) => code === 0 ? resolve(stdout.trim()) : reject(new Error(`打包 pnpm 退出码 ${code}: ${stderr}`)))
})
if (packagedPnpmVersion !== '11.22.0') throw new Error(`打包 pnpm 版本不正确：${packagedPnpmVersion}`)
const isolatedHome = await mkdtemp(path.join(os.tmpdir(), 'dsh-desktop-e2e-'))
const removableVersion = '0.0.1'
const removablePackageRoot = path.join(isolatedHome, 'electron', 'dsh-versions', removableVersion, 'node_modules', '@deepseek-ai', 'dsh')
await mkdir(removablePackageRoot, { recursive: true })
await writeFile(path.join(removablePackageRoot, 'package.json'), JSON.stringify({
  name: '@deepseek-ai/dsh', version: removableVersion, bin: { dsh: 'cli.js' }
}))
await writeFile(path.join(removablePackageRoot, 'cli.js'), 'throw new Error("E2E removable version must not launch")\n')
const launchEnvironment: NodeJS.ProcessEnv = { ...process.env, DSH_HOME: path.join(isolatedHome, 'official-dsh') }
if (process.platform === 'darwin') {
  for (const key of Object.keys(launchEnvironment)) {
    if (key.toLowerCase() === 'path') delete launchEnvironment[key]
  }
  launchEnvironment.PATH = '/usr/bin:/bin:/usr/sbin:/sbin'
}
const electronApp = await electron.launch({
  executablePath,
  args: [`--user-data-dir=${path.join(isolatedHome, 'electron')}`],
  env: { ...launchEnvironment, ELECTRON_ENABLE_LOGGING: '1' }
})
const applicationProcess = electronApp.process()
let applicationOutput = ''
const collectOutput = (chunk: Buffer | string): void => {
  applicationOutput = `${applicationOutput}${chunk.toString()}`.slice(-8_000)
}
applicationProcess.stdout?.on('data', collectOutput)
applicationProcess.stderr?.on('data', collectOutput)

try {
  let dshWindow
  try {
    dshWindow = await electronApp.firstWindow({ timeout: 45_000 })
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`打包应用未能打开窗口（退出码 ${applicationProcess.exitCode ?? 'unknown'}）：${reason}\n${applicationOutput}`)
  }
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
  await manager.getByRole('heading', { name: /^DSH\s+\d+\.\d+\.\d+/ }).waitFor()
  await manager.getByRole('button', { name: /全部版本|All versions/ }).waitFor()
  const installVersion = process.env.DSH_DESKTOP_E2E_INSTALL_VERSION
  if (installVersion) {
    const targetRow = manager.locator('article.version-row').filter({ hasText: installVersion })
    await targetRow.waitFor({ timeout: 30_000 })
    await targetRow.getByRole('button', { name: /安装|Install/ }).click()
    await targetRow.getByText(/已安装|Installed/, { exact: true }).waitFor({ timeout: 300_000 })
  }
  const removableRow = manager.locator('article.version-row').filter({ has: manager.getByText(removableVersion, { exact: true }) })
  await removableRow.waitFor()
  const uninstallButton = removableRow.getByRole('button', { name: /卸载|Uninstall/ })
  await uninstallButton.waitFor()
  await uninstallButton.click()
  await manager.getByText(removableVersion, { exact: true }).waitFor({ state: 'detached' })
  if (existsSync(path.join(isolatedHome, 'electron', 'dsh-versions', removableVersion))) throw new Error('卸载后版本目录仍然存在')
  await manager.getByText(/npm 官方源|Official npm registry/).waitFor()
  await manager.getByRole('heading', { name: /^DSH\s+\d+\.\d+\.\d+/ }).waitFor()
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
    await manager.getByRole('heading', { name: /^DSH\s+\d+\.\d+\.\d+/ }).waitFor({ timeout: 20_000 })
    await manager.screenshot({ path: process.env.DSH_DESKTOP_E2E_SCREENSHOT, fullPage: true })
  }
  await dshWindow.close()
  await manager.getByText(/未运行|Not running/, { exact: true }).waitFor({ timeout: 10_000 })
  console.log('Packaged E2E passed: bundled pnpm, direct official DSH launch, version removal, manager UI, and stop-on-close')
} finally {
  await electronApp.close()
  await rm(isolatedHome, { recursive: true, force: true })
}
