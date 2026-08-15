import { existsSync } from 'node:fs'
import path from 'node:path'

export interface RuntimePaths {
  node: string
  npmCli: string
}

export function resolveRuntimePaths(resourcesPath: string, isPackaged: boolean): RuntimePaths {
  if (!isPackaged && process.env.DSH_DESKTOP_NODE) {
    const npmCli = process.env.DSH_DESKTOP_NPM_CLI
    if (!npmCli) throw new Error('设置 DSH_DESKTOP_NODE 时也必须设置 DSH_DESKTOP_NPM_CLI')
    return { node: process.env.DSH_DESKTOP_NODE, npmCli }
  }

  const root = path.join(resourcesPath, 'runtime')
  const node = process.platform === 'win32' ? path.join(root, 'node.exe') : path.join(root, 'bin', 'node')
  const npmCli = process.platform === 'win32'
    ? path.join(root, 'npm', 'bin', 'npm-cli.js')
    : path.join(root, 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js')

  if (existsSync(node) && existsSync(npmCli)) return { node, npmCli }
  if (isPackaged) throw new Error('应用内置 Node.js 运行环境缺失，请重新安装 DSH Desktop')

  const localNode = process.env.npm_node_execpath ?? 'node'
  const localNpm = process.env.npm_execpath
  if (!localNpm) throw new Error('开发模式找不到 npm，请先运行 npm install')
  return { node: localNode, npmCli: localNpm }
}
