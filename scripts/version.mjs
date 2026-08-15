#!/usr/bin/env node
import fs from 'node:fs'
import process from 'node:process'

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'))
}

function writeJson(path, value) {
  fs.writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

function validVersion(value) {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(value)
}

function versions() {
  const packageJson = readJson('package.json')
  const lockfile = readJson('package-lock.json')
  return {
    packageJson,
    lockfile,
    packageVersion: packageJson.version,
    lockVersion: lockfile.version,
    lockRootVersion: lockfile.packages?.['']?.version
  }
}

function check() {
  const current = versions()
  if (!validVersion(current.packageVersion)) throw new Error(`package.json 版本无效：${current.packageVersion}`)
  const mismatches = [current.lockVersion, current.lockRootVersion].filter((value) => value !== current.packageVersion)
  if (mismatches.length) throw new Error(`版本未同步：package.json=${current.packageVersion}，package-lock.json=${current.lockVersion}/${current.lockRootVersion}`)
  console.log(`版本一致：${current.packageVersion}`)
}

function setVersion(version) {
  if (!validVersion(version)) throw new Error(`版本号无效：${version}`)
  const current = versions()
  current.packageJson.version = version
  current.lockfile.version = version
  if (!current.lockfile.packages?.['']) throw new Error('package-lock.json 缺少根包信息')
  current.lockfile.packages[''].version = version
  writeJson('package.json', current.packageJson)
  writeJson('package-lock.json', current.lockfile)
  console.log(`版本已更新为 ${version}`)
}

const [command, value] = process.argv.slice(2)
try {
  if (command === 'check') check()
  else if (command === 'set' && value) setVersion(value)
  else {
    console.error('用法：node scripts/version.mjs check | set <x.y.z>')
    process.exit(2)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
