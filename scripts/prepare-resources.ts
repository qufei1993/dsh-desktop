import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const nodeVersion = '24.18.1'
const dshVersion = '0.1.0-rc.6'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function argument(name: string, fallback: string): string {
  return process.argv.find((value) => value.startsWith(`--${name}=`))?.split('=')[1] ?? fallback
}

const platform = argument('platform', process.platform)
const arch = argument('arch', process.arch)
if (!['darwin', 'win32'].includes(platform) || !['arm64', 'x64'].includes(arch)) throw new Error('仅支持 darwin arm64/x64 与 win32 x64 资源')
if (platform === 'win32' && arch !== 'x64') throw new Error('首版 Windows 仅支持 x64')
if (platform !== process.platform) throw new Error('请在目标操作系统的 CI runner 上准备运行资源')

const nodePlatform = platform === 'win32' ? 'win' : 'darwin'
const extension = platform === 'win32' ? 'zip' : 'tar.gz'
const archiveName = `node-v${nodeVersion}-${nodePlatform}-${arch}.${extension}`
const baseUrl = `https://nodejs.org/dist/v${nodeVersion}`
const resourceRoot = path.join(root, 'build-resources')
const target = path.join(resourceRoot, 'runtime')
const temporary = path.join(resourceRoot, `.prepare-${platform}-${arch}-${process.pid}`)

async function download(url: string): Promise<Buffer> {
  let lastError: unknown
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      console.log(`Downloading ${path.basename(url)} (attempt ${attempt}/3)`)
      const response = await fetch(url, { signal: AbortSignal.timeout(300_000) })
      if (!response.ok) throw new Error(`下载失败 ${response.status}: ${url}`)
      return Buffer.from(await response.arrayBuffer())
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

async function run(executable: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(executable, args, { stdio: 'inherit', shell: false })
    child.once('error', reject)
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`${executable} 退出码 ${code}`)))
  })
}

async function main(): Promise<void> {
  const node = platform === 'win32' ? path.join(target, 'node.exe') : path.join(target, 'bin', 'node')
  const npmCli = platform === 'win32'
    ? path.join(target, 'node_modules', 'npm', 'bin', 'npm-cli.js')
    : path.join(target, 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js')
  let reusable = false
  try {
    const marker = JSON.parse(await readFile(path.join(target, 'dsh-desktop-runtime.json'), 'utf8')) as Record<string, string>
    reusable = marker.nodeVersion === nodeVersion && marker.platform === platform && marker.arch === arch && existsSync(node) && existsSync(npmCli)
  } catch { /* Prepare the runtime below. */ }

  if (!reusable) {
    await rm(temporary, { recursive: true, force: true })
    await mkdir(temporary, { recursive: true })
    const archive = await download(`${baseUrl}/${archiveName}`)
    const sums = (await download(`${baseUrl}/SHASUMS256.txt`)).toString('utf8')
    const expected = sums.split('\n').find((line) => line.endsWith(`  ${archiveName}`))?.split(/\s+/)[0]
    const actual = createHash('sha256').update(archive).digest('hex')
    if (!expected || expected !== actual) throw new Error('Node.js 官方发行包 SHA-256 校验失败')
    const archivePath = path.join(temporary, archiveName)
    await writeFile(archivePath, archive)
    const extractDir = path.join(temporary, 'extract')
    await mkdir(extractDir)
    if (platform === 'win32') {
      const command = `Expand-Archive -LiteralPath '${archivePath.replaceAll("'", "''")}' -DestinationPath '${extractDir.replaceAll("'", "''")}' -Force`
      await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command])
    } else {
      await run('tar', ['-xzf', archivePath, '-C', extractDir])
    }
    const extractedName = (await readdir(extractDir))[0]
    if (!extractedName) throw new Error('Node.js 发行包为空')
    await rm(target, { recursive: true, force: true })
    await mkdir(path.dirname(target), { recursive: true })
    await rename(path.join(extractDir, extractedName), target)
    await writeFile(path.join(target, 'dsh-desktop-runtime.json'), `${JSON.stringify({ nodeVersion, platform, arch })}\n`)
  } else {
    console.log(`Reusing verified Node.js v${nodeVersion} runtime for ${platform}-${arch}`)
  }
  const dshRoot = path.join(resourceRoot, 'dsh', dshVersion)
  await rm(dshRoot, { recursive: true, force: true })
  await mkdir(dshRoot, { recursive: true })
  await writeFile(path.join(dshRoot, 'package.json'), `${JSON.stringify({
    name: 'dsh-desktop-bundled-dsh', version: '0.0.0', private: true,
    dependencies: { '@deepseek-ai/dsh': dshVersion }
  })}\n`)
  await run(node, [npmCli, 'install', '--prefix', dshRoot, '--no-audit', '--no-fund', '--prefer-offline', '--registry=https://registry.npmjs.org/'])
  const manifest = JSON.parse(await readFile(path.join(dshRoot, 'node_modules', '@deepseek-ai', 'dsh', 'package.json'), 'utf8')) as { name?: string; version?: string }
  if (manifest.name !== '@deepseek-ai/dsh' || manifest.version !== dshVersion) throw new Error('预装官方 DSH 校验失败')
  await rm(temporary, { recursive: true, force: true })
  console.log(`Prepared Node.js v${nodeVersion} and @deepseek-ai/dsh@${dshVersion} for ${platform}-${arch}`)
}

await main()
