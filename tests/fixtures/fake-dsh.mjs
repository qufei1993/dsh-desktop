import { spawnSync } from 'node:child_process'
import http from 'node:http'

if (process.argv.includes('--version')) {
  console.log('1.0.0')
  process.exit(0)
}

if (process.env.DSH_DESKTOP_TEST_REQUIRE_DSH_CLI === '1') {
  const command = process.platform === 'win32'
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', 'dsh --version'], { env: process.env, windowsHide: true })
    : spawnSync('/bin/sh', ['-c', 'command -v dsh >/dev/null && dsh --version >/dev/null'], { env: process.env })
  if (command.status !== 0) process.exit(23)
}

const server = http.createServer((_request, response) => response.end('ok'))
server.listen(0, '127.0.0.1', () => {
  const address = server.address()
  if (typeof address === 'object' && address) console.log(`dsh web: http://127.0.0.1:${address.port}`)
})
process.on('SIGTERM', () => server.close(() => process.exit(0)))
