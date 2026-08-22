import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseLoopbackUrl, prependRuntimePath } from '../src/main/dsh-supervisor'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const platform = process.platform
const arch = process.arch
const runtime = path.join(root, 'build-resources', 'runtime')
const node = platform === 'win32' ? path.join(runtime, 'node.exe') : path.join(runtime, 'bin', 'node')
const runtimeBin = path.join(root, 'build-resources', 'runtime-bin')
const packageRoot = path.join(root, 'build-resources', 'dsh', '0.1.0-rc.6', 'node_modules', '@deepseek-ai', 'dsh')
const manifest = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8')) as { bin: string | Record<string, string> }
const bin = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin.dsh
const entry = path.resolve(packageRoot, bin)
const temporaryHome = await mkdtemp(path.join(os.tmpdir(), 'dsh-desktop-smoke-'))
const runtimeEnvironment = {
  ...prependRuntimePath(process.env, [runtimeBin, path.dirname(node)]),
  DSH_DESKTOP_NODE: node,
  DSH_DESKTOP_DSH_ENTRY: entry
}

async function verifyBundledPnpm(): Promise<void> {
  const executable = platform === 'win32' ? 'cmd.exe' : 'pnpm'
  const args = platform === 'win32' ? ['/d', '/s', '/c', 'pnpm --version'] : ['--version']
  const output = await new Promise<string>((resolve, reject) => {
    const command = spawn(executable, args, { env: runtimeEnvironment, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    command.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    command.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })
    command.once('error', reject)
    command.once('exit', (code) => code === 0 ? resolve(stdout.trim()) : reject(new Error(`内置 pnpm 退出码 ${code}: ${stderr}`)))
  })
  if (output !== '11.22.0') throw new Error(`内置 pnpm 版本不正确：${output}`)
}

async function verifySelectedDshCli(): Promise<void> {
  const executable = platform === 'win32' ? 'cmd.exe' : 'dsh'
  const args = platform === 'win32' ? ['/d', '/s', '/c', 'dsh --version'] : ['--version']
  const output = await new Promise<string>((resolve, reject) => {
    const command = spawn(executable, args, { env: runtimeEnvironment, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    command.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    command.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })
    command.once('error', reject)
    command.once('exit', (code) => code === 0 ? resolve(stdout.trim()) : reject(new Error(`当前 DSH CLI 退出码 ${code}: ${stderr}`)))
  })
  if (output !== '0.1.0-rc.6') throw new Error(`当前 DSH CLI 版本不正确：${output}`)
}

await verifyBundledPnpm()
await verifySelectedDshCli()
const child = spawn(node, [entry, 'web', '--port', '0'], {
  env: { ...runtimeEnvironment, DSH_HOME: temporaryHome }, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']
})

try {
  const url = await new Promise<string>((resolve, reject) => {
    let output = ''
    const timer = setTimeout(() => reject(new Error('官方 DSH 冒烟启动超时')), 45_000)
    const consume = (chunk: Buffer): void => {
      output += chunk.toString()
      const found = parseLoopbackUrl(output)
      if (found) { clearTimeout(timer); resolve(found) }
    }
    child.stdout.on('data', consume)
    child.stderr.on('data', consume)
    child.once('error', reject)
    child.once('exit', (code) => reject(new Error(`官方 DSH 提前退出：${code}`)))
  })
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  const html = await response.text()
  if (!response.ok || !html.includes('window.__DSH_BOOT__')) throw new Error('官方 DSH 页面响应或启动标记校验失败')
  console.log(`Official DSH smoke passed: selected dsh CLI and pnpm 11.22.0 available, HTTP ${response.status}, bootstrap marker present`)
} finally {
  child.kill('SIGTERM')
  await rm(temporaryHome, { recursive: true, force: true })
}
