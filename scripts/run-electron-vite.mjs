import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const command = process.argv[2]
if (!command) throw new Error('缺少 electron-vite 命令')

const electronExecutable = require('electron')
const electronViteRoot = path.dirname(require.resolve('electron-vite/package.json'))
const cli = path.join(electronViteRoot, 'bin', 'electron-vite.js')
const child = spawn(process.execPath, [cli, command, ...process.argv.slice(3)], {
  stdio: 'inherit',
  env: { ...process.env, ELECTRON_EXEC_PATH: electronExecutable }
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal))
}

child.on('error', (error) => {
  console.error(error)
  process.exitCode = 1
})

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exitCode = code ?? 1
})
