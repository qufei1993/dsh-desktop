export const channels = {
  snapshot: 'dsh:snapshot',
  refresh: 'dsh:refresh',
  install: 'dsh:install',
  uninstall: 'dsh:uninstall',
  select: 'dsh:select',
  launch: 'dsh:launch',
  stop: 'dsh:stop',
  dismissUpdate: 'dsh:dismiss-update',
  openExternal: 'dsh:open-external',
  setLocale: 'desktop:set-locale',
  stateChanged: 'dsh:state-changed',
  installProgress: 'dsh:install-progress',
  appUpdateSnapshot: 'desktop-update:snapshot',
  appUpdateCheck: 'desktop-update:check',
  appUpdateDownload: 'desktop-update:download',
  appUpdateInstall: 'desktop-update:install',
  appUpdateChanged: 'desktop-update:changed'
} as const
