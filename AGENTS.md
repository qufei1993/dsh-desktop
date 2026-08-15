# DSH Desktop Project Rules

## Product boundary

- DSH Desktop is a community Electron shell for the official `@deepseek-ai/dsh` package on macOS and Windows.
- Keep official DSH unchanged: do not fork, patch, rebuild, inject into, or take ownership of its data and behavior.
- The desktop app may bundle Node.js, install and switch exact official DSH versions, supervise the local process, and display the official web UI.
- Keep DSH package updates and DSH Desktop application updates as separate, user-controlled channels.

## Required practices

- Make the smallest change that fully solves the request. Preserve unrelated work and do not stop for routine confirmations when the intent is clear.
- Support macOS Apple Silicon, macOS Intel, and Windows x64; do not introduce platform-specific assumptions without a guarded fallback.
- Preserve the security boundary: DSH binds to `127.0.0.1`, its window exposes no Node.js or Electron API, and privileged operations stay behind validated IPC.
- All visible application text must exist in both Simplified Chinese and English.
- Before finishing code changes, run `npm run verify`; run the relevant packaged or official-DSH smoke test when the change affects packaging, runtime startup, or the DSH boundary.

## Documentation

- English `*.md` files are the default documentation. Their Simplified Chinese counterparts use the `*.zh-CN.md` suffix.
- Whenever a paired English or Chinese document changes, update the other language in the same change. This includes README, CHANGELOG, governance, support, security, release, and repository-setup documents.
- New public documentation must provide both languages. Internal design notes and this AI rule file do not require a translated duplicate.
- Keep translations equivalent in meaning, links, commands, versions, and release facts; do not let one language become more current than the other.
- GitHub Release notes are extracted from the matching version section in `CHANGELOG.md`; keep `CHANGELOG.zh-CN.md` synchronized.

## Release integrity

- Keep the versions in `package.json` and `package-lock.json` synchronized through `npm run version:set -- x.y.z`.
- A release tag must be exactly `vx.y.z`, and the matching changelog section must exist before the tag is pushed.
- Releases are intentionally unsigned because the project has no paid platform certificates. Do not add signing-secret requirements or imply that builds are signed or notarized.
- Keep unsigned-install warnings accurate. macOS application updates are check-and-download-manually; Windows may use the in-app updater.
