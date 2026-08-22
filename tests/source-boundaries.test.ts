import { describe, expect, it } from 'vitest'
import { sourceBoundaryViolations } from '../scripts/source-boundaries'

describe('source-layer boundaries', () => {
  it('keeps renderer code away from Electron, Node.js, main, and preload modules', () => {
    const content = `
import React from 'react'
import { readFile } from 'node:fs/promises'
import { ipcRenderer } from 'electron'
import controller from '../main/controller'
import bridge from '../preload/index'
import type { AppSnapshot } from '../shared/contracts'
`
    expect(sourceBoundaryViolations('src/renderer/view.tsx', content)).toEqual([
      'renderer must not import node:fs/promises',
      'renderer must not import electron',
      'renderer must not import src/main/controller',
      'renderer must not import src/preload/index'
    ])
  })

  it('keeps shared contracts independent of privileged and presentation layers', () => {
    const content = `
import { z } from 'zod'
import path from 'node:path'
import manager from '../main/version-manager'
import view from '../renderer/src'
`
    expect(sourceBoundaryViolations('src/shared/contracts.ts', content)).toEqual([
      'shared must not import node:path',
      'shared must not import src/main/version-manager',
      'shared must not import src/renderer/src'
    ])
  })

  it('allows preload to expose Electron through shared contracts only', () => {
    const valid = `
import { contextBridge } from 'electron'
import type { DesktopApi } from '../shared/contracts'
`
    expect(sourceBoundaryViolations('src/preload/index.ts', valid)).toEqual([])
    expect(sourceBoundaryViolations('src/preload/index.ts', "import updater from '../main/app-updater'")).toEqual([
      'preload may import only electron and src/shared, got ../main/app-updater'
    ])
  })

  it('rejects official DSH source imports and unsafe process or window configuration', () => {
    const content = `
import internal from '@deepseek-ai/dsh/private'
const home = 'DSH_HOME'
const options = { nodeIntegration: true, shell: true }
`
    expect(sourceBoundaryViolations('src/main/example.ts', content)).toEqual([
      'production source must not override DSH_HOME',
      'must not import official DSH source modules',
      'Node integration must stay disabled',
      'child processes must not use a shell'
    ])
  })
})
