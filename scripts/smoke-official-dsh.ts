import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseLoopbackUrl } from '../src/main/dsh-supervisor'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const platform = process.platform
const arch = process.arch
const runtime = path.join(root, 'build-resources', 'runtime')
const node = platform === 'win32' ? path.join(runtime, 'node.exe') : path.join(runtime, 'bin', 'node')
const packageRoot = path.join(root, 'build-resources', 'dsh', '0.1.0-rc.6', 'node_modules', '@deepseek-ai', 'dsh')
const manifest = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8')) as { bin: string | Record<string, string> }
const bin = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin.dsh
const temporaryHome = await mkdtemp(path.join(os.tmpdir(), 'dsh-desktop-smoke-'))
const child = spawn(node, [path.resolve(packageRoot, bin), 'web', '--port', '0'], {
  env: { ...process.env, DSH_HOME: temporaryHome }, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']
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
  console.log(`Official DSH smoke passed: HTTP ${response.status}, bootstrap marker present`)
} finally {
  child.kill('SIGTERM')
  await rm(temporaryHome, { recursive: true, force: true })
}
