<p align="center">English | <a href="README.zh-CN.md">简体中文</a></p>

<div align="center">
  <img src="build/icon-source.svg" width="112" alt="DSH Desktop icon">
  <h1>DSH Desktop</h1>
  <p>Run and manage the official DeepSeek Harness without installing Node.js.</p>

  [![Build](https://github.com/qufei1993/dsh-desktop/actions/workflows/build.yml/badge.svg)](https://github.com/qufei1993/dsh-desktop/actions/workflows/build.yml)
  [![Latest release](https://img.shields.io/github/v/release/qufei1993/dsh-desktop?display_name=tag)](https://github.com/qufei1993/dsh-desktop/releases/latest)
  [![License](https://img.shields.io/github/license/qufei1993/dsh-desktop)](LICENSE)
</div>

DSH Desktop is a community-maintained DeepSeek Harness desktop client for macOS and Windows. It bundles Node.js 24 LTS, installs and retains official `@deepseek-ai/dsh` versions, and runs the official `dsh web` interface in a dedicated window.

> [!IMPORTANT]
> This project is maintained independently by the community and is not affiliated with DeepSeek. DSH Desktop does not modify DeepSeek Harness; the official DSH package continues to operate under its own license and behavior.

## Download and use

Download the installer for your system from [GitHub Releases](https://github.com/qufei1993/dsh-desktop/releases/latest):

| System | Installer |
| --- | --- |
| macOS Apple Silicon | `DSH-Desktop-*-arm64.dmg` |
| macOS Intel | `DSH-Desktop-*-x64.dmg` |
| Windows 10/11 x64 | `DSH-Desktop-Setup-*-x64.exe` |

After installation, DSH Desktop opens the official DeepSeek Harness interface directly. Open **Version Manager…** from the application menu when you need to install or switch DSH versions.

> [!NOTE]
> This project is at an early stage. If no installer is available under Releases yet, wait for the first public release. Building from source is not recommended for regular users.

## Features

- Bundled Node.js 24 LTS; no system Node.js setup required.
- A validated official DSH version included with every installer.
- Search, install, and switch between all DSH versions published to the official npm registry.
- Keep multiple DSH versions and return to an earlier version when needed.
- User-controlled DSH Desktop updates from GitHub Releases.
- Simplified Chinese and English interfaces, with system-language defaults and manual switching.
- Shared proxy handling for GitHub updates, npm version queries, and DSH package installation.
- Separate builds for macOS Apple Silicon, macOS Intel, and Windows x64.
- SHA-256 checksums, two CycloneDX SBOMs, and a third-party license inventory with every release.

## Product boundaries

DSH Desktop manages the runtime, versions, and local process. It does not:

- fork, patch, rebuild, or inject code into official DSH;
- manage API keys, models, sessions, plugins, Skills, or MCP;
- read, migrate, back up, or delete DSH user data;
- silently upgrade or replace the DSH version selected by the user;
- expose the local DSH service to the LAN.

Official DSH and DSH Desktop use separate update channels. DSH versions come from npm and are installed by the user. DSH Desktop updates come from this repository's GitHub Releases and are downloaded and installed only with user approval.

## Network proxy

Network access uses the first available option:

1. Explicit `HTTPS_PROXY`, `HTTP_PROXY`, or related environment variables.
2. The macOS or Windows system proxy.
3. A listening proxy at `127.0.0.1:7890` when the system is otherwise configured for direct access.
4. A direct connection when no proxy is found.

This policy covers DSH Desktop updates, npm version queries, and official DSH package downloads. The official DSH page always connects directly to `127.0.0.1` and never passes through a proxy.

## Security and privacy

- The official DSH process binds only to a random port on `127.0.0.1`.
- The DSH window exposes neither Electron nor Node.js APIs.
- The management window receives only a validated, minimal IPC surface.
- Production builds do not override `DSH_HOME`; official DSH controls its data behavior.
- Downloaded Node.js runtimes are checked against official SHA-256 manifests, and DSH installs use exact versions.

Report security issues privately according to the [security policy](SECURITY.md). Do not open a public issue.

## Local development

Developers need Node.js 22.19+ or 24+:

```bash
npm ci
npm run prepare:runtime
npm run dev
```

`prepare:runtime` downloads and validates the pinned Node.js 24 LTS runtime, then installs the bundled DSH version with that runtime. Generated files are stored under the ignored `build-resources/` directory.

Before submitting changes, run:

```bash
npm run verify
npm run test:official
```

`verify` runs version consistency checks, type checking, automated tests, the production build, and the product-boundary audit. See the [contribution guide](CONTRIBUTING.md) for the complete workflow.

## Architecture overview

```text
Electron main process
  └─ Bundled Node.js 24 LTS
      └─ Official @deepseek-ai/dsh web --port 0
          └─ http://127.0.0.1:<random-port>
              └─ Sandboxed DSH window
```

The existing [design specification](docs/superpowers/specs/2026-08-15-dsh-desktop-design.md) documents the full boundary, process model, and data constraints in Chinese. For project governance, support, and release history, see [Maintainers](MAINTAINERS.md), [Support](SUPPORT.md), and the [Changelog](CHANGELOG.md).

Maintainers should also read the [release guide](docs/RELEASING.md) and [repository setup checklist](docs/REPOSITORY_SETUP.md).
