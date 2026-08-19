import { existsSync } from 'node:fs'
import path from 'node:path'

export interface RuntimePaths {
  node: string
  npmCli: string
  pnpmCli: string
  commandDir: string
}

export function resolveRuntimePaths(resourcesPath: string, isPackaged: boolean): RuntimePaths {
  if (!isPackaged && process.env.DSH_DESKTOP_NODE) {
    const npmCli = process.env.DSH_DESKTOP_NPM_CLI
    const pnpmCli = process.env.DSH_DESKTOP_PNPM_CLI
    const commandDir = process.env.DSH_DESKTOP_COMMAND_DIR
    if (!npmCli || !pnpmCli || !commandDir) {
      throw new Error('设置 DSH_DESKTOP_NODE 时也必须设置 DSH_DESKTOP_NPM_CLI、DSH_DESKTOP_PNPM_CLI 和 DSH_DESKTOP_COMMAND_DIR')
    }
    return { node: process.env.DSH_DESKTOP_NODE, npmCli, pnpmCli, commandDir }
  }

  const root = path.join(resourcesPath, 'runtime')
  const node = process.platform === 'win32' ? path.join(root, 'node.exe') : path.join(root, 'bin', 'node')
  const npmCli = process.platform === 'win32'
    ? path.join(root, 'npm', 'bin', 'npm-cli.js')
    : path.join(root, 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js')
  const pnpmCli = path.join(resourcesPath, 'package-manager', 'pnpm', 'bin', 'pnpm.mjs')
  const commandDir = path.join(resourcesPath, 'runtime-bin')
  const pnpmCommand = path.join(commandDir, process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm')

  if (existsSync(node) && existsSync(npmCli) && existsSync(pnpmCli) && existsSync(pnpmCommand)) {
    return { node, npmCli, pnpmCli, commandDir }
  }
  if (isPackaged) throw new Error('应用内置 Node.js 或 pnpm 运行环境缺失，请重新安装 DSH Desktop')

  const localNode = process.env.npm_node_execpath ?? process.execPath
  const localNpm = process.env.npm_execpath
  const localPnpm = path.join(process.cwd(), 'node_modules', 'pnpm', 'bin', 'pnpm.mjs')
  if (!localNpm || !existsSync(localPnpm)) throw new Error('开发模式找不到 npm 或 pnpm，请先运行 npm install')
  return { node: localNode, npmCli: localNpm, pnpmCli: localPnpm, commandDir: path.join(process.cwd(), 'node_modules', '.bin') }
}
