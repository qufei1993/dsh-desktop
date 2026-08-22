# Decision: Run official DSH with an independent Node.js runtime

Status: implemented
Category: architecture

English | [简体中文](2026-08-15-independent-node-runtime.zh-CN.md)

## Problem

DSH Desktop must run the official `@deepseek-ai/dsh` package consistently on supported machines without requiring users to install or configure Node.js. Electron's embedded Node.js has its own ABI and upgrade lifecycle, while a system Node.js is uncontrolled and may be missing or incompatible.

## Decision

DSH Desktop bundles a pinned official Node.js 24 LTS runtime for each supported operating-system and CPU target. The Electron main process launches official DSH as a child process using the absolute bundled Node.js path and the package's resolved CLI entry. It does not execute DSH inside Electron's Node.js runtime and does not depend on a system Node.js installation.

## Alternatives considered

**Electron's embedded Node.js.** This would couple official DSH and native dependencies to Electron's Node.js, V8, ABI, and upgrade schedule, which differs from the official execution environment.

**The user's system Node.js.** This would reduce installer size but make first launch depend on an external installation, version, PATH, and package-manager configuration.

**Tauri plus a bundled Node.js.** DSH would still require Node.js while the project would add Rust and platform WebView differences without removing the central runtime requirement.

## Consequences

Installers are larger and require target-specific runtime preparation. In exchange, DSH startup is reproducible, independent of shell configuration, and close to the official Node.js execution model. Runtime and Electron upgrades remain separate compatibility decisions.

## Verification

`npm run prepare:runtime` downloads and validates the pinned runtime. `npm run test:official` starts the bundled official DSH with that runtime. Packaged E2E verifies the runtime and package manager inside the final application resources.
