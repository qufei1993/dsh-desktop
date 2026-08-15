import type { DesktopApi } from './contracts'

declare global {
  interface Window {
    dshDesktop: DesktopApi
  }
}

export {}
