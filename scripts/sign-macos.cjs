const { execFile } = require('node:child_process')
const { promisify } = require('node:util')

const execFileAsync = promisify(execFile)

/**
 * Apply an ad-hoc signature without electron-osx-sign's unbounded JS file scan.
 * The native --deep traversal signs Electron helpers and bundled executables.
 */
exports.sign = async function signMacApp(options) {
  if (process.platform !== 'darwin') throw new Error('macOS signing can only run on macOS')

  await execFileAsync('/usr/bin/codesign', [
    '--force',
    '--deep',
    '--sign',
    '-',
    '--timestamp=none',
    options.app
  ])
  await execFileAsync('/usr/bin/codesign', ['--verify', '--deep', '--strict', options.app])
}
