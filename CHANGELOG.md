English | [简体中文](CHANGELOG.zh-CN.md)

# Changelog

This file records notable changes to DSH Desktop. Versions follow [Semantic Versioning](https://semver.org/).

## Unreleased

## [0.2.1] - 2026-08-20

### Fixed

- Refreshed npm registry metadata before installing official DSH versions, preventing newly published versions from failing because of stale local metadata.
- Determined the newest available DSH version from the highest valid package version instead of a potentially lagging npm `latest` tag.
- Started DSH 0.1.0-rc.8 and later with `--no-open`, keeping the official web UI inside the desktop window without also opening the system browser.
- Bundled pnpm 11.22.0 and exposed the bundled Node.js and pnpm commands only to official DSH child processes, so plugin operations work with a minimal GUI `PATH`. Unapproved dependency build scripts remain blocked without turning otherwise valid plugin updates into fatal `ERR_PNPM_IGNORED_BUILDS` failures.

## [0.2.0] - 2026-08-16

### Added

- Detection of newer official DSH package versions, with a dismissible update notice in the official DSH window and a direct update action in Version Manager.

## [0.1.0] - 2026-08-15

### Added

- Desktop applications for macOS Apple Silicon, macOS Intel, and Windows x64.
- A bundled Node.js 24 LTS runtime and a validated official DSH version.
- Official npm catalog browsing, installation, retention, and switching for DSH versions.
- Direct launch into the official DSH interface, with Version Manager available from the application menu.
- User-controlled DSH Desktop updates through GitHub Releases: manual download on macOS and in-app installation on Windows.
- Automatic proxy selection from environment variables, system settings, or `127.0.0.1:7890`.
- A native About panel, Version Manager menu icon, and app-update control.
- Simplified Chinese and English interfaces with system-language defaults and saved user selection.

### Changed

- Reduced release downloads by keeping only target-platform native DSH dependencies, removing Windows debug symbols, and enabling maximum installer compression.
- Simplified the Release download list to three platform installers; Windows retains only its required update manifest.

### Security

- The DSH page runs in a sandboxed window without preload, Node.js, or Electron APIs.
- The local DSH service is restricted to `127.0.0.1`.
- Runtime verification, exact-version installation, and automated product-boundary auditing.
- Community builds without paid platform certificates, using macOS ad-hoc signing.
