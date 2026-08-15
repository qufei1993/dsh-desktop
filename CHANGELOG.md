English | [简体中文](CHANGELOG.zh-CN.md)

# Changelog

This file records notable changes to DSH Desktop. Versions follow [Semantic Versioning](https://semver.org/).

## Unreleased

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
- SHA-256 checksums, CycloneDX SBOMs, and a third-party license inventory.

### Security

- The DSH page runs in a sandboxed window without preload, Node.js, or Electron APIs.
- The local DSH service is restricted to `127.0.0.1`.
- Runtime verification, exact-version installation, and automated product-boundary auditing.
- Explicit unsigned community builds with published SHA-256 checksums instead of paid platform certificates.
