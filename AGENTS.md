# DSH Desktop Project Rules

English (authoritative AI instructions) | [简体中文（人工审阅）](AGENTS.zh-CN.md)

## Product boundary

- DSH Desktop is a community Electron shell for the official `@deepseek-ai/dsh` package on macOS and Windows.
- Keep official DSH unchanged: do not fork, patch, rebuild, inject into, or import private modules from it, and do not take ownership of its configuration, credentials, sessions, plugins, Skills, MCP, permissions, or user data.
- The desktop app owns only its bundled runtime, exact official DSH installations, application state, process supervision, Desktop-owned windows, and application update channel.
- Keep official DSH package updates and DSH Desktop application updates separate and user-controlled. Never install, select, switch, or replace a DSH version without an explicit user action.

## Architecture invariants

- Preserve the runtime chain: Electron main process → bundled standard Node.js child process → official DSH CLI → `http://127.0.0.1:<random-port>` → isolated DSH `BrowserWindow`.
- Run DSH only with the bundled Node.js and resolved official CLI entry. Do not run it inside Electron's Node.js or depend on system Node.js, npm, pnpm, or shell `PATH` to locate the runtime.
- The Electron main process is the only privileged application layer. Filesystem, network, process, updater, menu, window, and external-URL operations execute there.
- The official DSH window displays only the official Web UI. It has no preload, receives no Desktop controls or injected code, and exposes no Node.js, Electron, or Desktop IPC API.
- Desktop-owned renderer code reaches privileged behavior only through the typed preload bridge. The main process validates untrusted IPC input again before performing an operation.
- Keep official DSH and Desktop state separate. Production code inherits an existing `DSH_HOME` but never sets, redirects, reads, migrates, backs up, or deletes it.

## Repository layout

```text
src/main/       Privileged Electron composition, windows, process, versions, network, state, and updates
src/preload/    Minimal typed bridge from the Desktop renderer to validated IPC
src/renderer/   Unprivileged Desktop-owned management UI and styles
src/shared/     IPC channels, schemas, and cross-process types with no privileged dependencies
scripts/        Build, packaging, release, smoke-test, and deterministic repository gates
tests/          Behavior tests; reusable fake executables and data live under tests/fixtures/
docs/           Maintainer and contributor documentation
.agents/skills/ Repeatable repository-specific AI workflows
.agents/notes/  Durable product and engineering decisions
build/          Reviewed static source assets used by packaging
out/            Generated production build; never edit or commit
release/        Generated installers and release metadata; never edit as source or commit
build-resources/ Downloaded/generated runtime and official DSH resources; never edit as source or commit
```

## Placement and dependency rules

- Keep `src/main/index.ts` as the application composition, window, menu, and IPC-wiring entrypoint. Move independently testable process, installation, update, network, state, and policy behavior into focused `src/main/` modules.
- `src/preload/` may import Electron and `src/shared/` only. It exposes the narrow `DesktopApi` bridge and contains no filesystem, network, installation, update, or process-management business logic.
- `src/renderer/` may import renderer libraries and `src/shared/`; it must not import Electron, Node.js built-ins, `src/main/`, or `src/preload/`.
- `src/shared/` contains environment-neutral types, schemas, and constants. It must not import Electron, Node.js built-ins, main, preload, or renderer modules.
- Centralize IPC names in `src/shared/ipc-channels.ts`, cross-process contracts and validation schemas in `src/shared/contracts.ts`, and bridge exposure in `src/preload/index.ts`.
- Production source interacts with official DSH only through its public CLI and loopback HTTP endpoint. Never add `@deepseek-ai/dsh` source imports.
- Put tests under root `tests/`, not beside production files. Put shared test executables and data under `tests/fixtures/`.
- Do not edit generated output or vendored dependencies under `out/`, `release/`, `build-resources/`, or `node_modules/`; change their source or generator instead.

## Runtime and version lifecycle

- A `DshSupervisor` owns at most one DSH child process. Starting or switching versions must stop the owned process first; application shutdown must terminate the owned process tree.
- Spawn child processes with absolute executable paths, `shell: false`, and platform-aware environment handling. Preserve cleanup across startup failure, timeout, cancellation, normal stop, and unexpected exit.
- Accept a DSH URL only after parsing an explicit `http://127.0.0.1:<port>` endpoint and completing the health check. Create the DSH window only after readiness succeeds.
- Install only exact valid SemVer versions of the official package. Install into an application-owned temporary directory, validate the package and CLI, and publish through an atomic same-filesystem rename.
- Failed, cancelled, or interrupted installation must not damage an installed version. Uninstall only complete version directories owned by DSH Desktop and never touch official DSH user data.
- Installing a version does not select or launch it unless the user explicitly requested that combined action. Keep previous complete versions available for user-controlled rollback.

## Security and platform rules

- Support macOS Apple Silicon, macOS Intel, and Windows x64. Guard platform-specific paths, executable names, process behavior, packaging resources, and updater behavior with a tested fallback or explicit failure.
- Keep every `BrowserWindow` at `nodeIntegration: false`, `contextIsolation: true`, and `sandbox: true`. The official DSH window has no preload; Desktop-owned windows use only the validated bridge.
- Deny permission requests where applicable, prevent untrusted navigation and window creation, and open only validated HTTPS external URLs through the system browser.
- Do not enable shell-based child processes, expose the DSH service beyond loopback, or place privileged capabilities in renderer code.
- All visible application text must exist in both Simplified Chinese and English with equivalent interpolation and behavior.

## Change and verification rules

- Make the smallest change that fully solves the request. Preserve unrelated work and do not stop for routine confirmation when intent is clear.
- Add focused regression tests for behavior changes. Test denial paths for security and ownership rules, and exercise the real packaged or official-DSH entry path when mocks cannot prove the shipped behavior.
- Before finishing code changes, run `npm run verify`. Run `npm run test:official` for bundled-runtime, DSH-startup, package-manager, CLI-resolution, or DSH-boundary changes. Build the current-platform installer and run `npm run test:packaged` for packaging, packaged resources, Electron startup, or packaged UI changes.
- Report only checks actually run. When a required platform cannot be tested locally, state the missing platform evidence and rely on the CI matrix rather than implying local coverage.

## AI engineering infrastructure

- Repository-specific workflows live under `.agents/skills/`. Read the matching `SKILL.md` before code review, pre-push verification, release work, bilingual documentation work, or Decision Note maintenance.
- Durable rationale lives under `.agents/notes/`. Consult active notes before changing product ownership, runtime isolation, Electron security, version management, update behavior, testing strategy, or release process.
- Add or update a Decision Note when a non-trivial change establishes or revises a durable product, architecture, security, process, or testing decision. Do not use Notes as task plans, changelogs, or substitutes for user documentation.
- Follow `.agents/notes/README.md` for lifecycle transitions. Archived Notes are frozen historical evidence, not current authority.
- Keep AI infrastructure documentation, Decision Notes, `AGENTS.md`, and every `SKILL.md` paired in English and Simplified Chinese. Standard English filenames remain authoritative machine instructions; `.zh-CN.md` files are equivalent human-review mirrors.

## Documentation

- English `*.md` files are the default documentation. Their Simplified Chinese counterparts use the `*.zh-CN.md` suffix.
- Whenever either side of a pair changes, update the other language in the same change. Keep meaning, links, commands, versions, warnings, and release facts equivalent.
- New public documentation must provide both languages. Internal design notes are exempt unless they belong to the bilingual `.agents` infrastructure or otherwise declare a pair.
- GitHub Release notes are extracted from the matching version section in `CHANGELOG.md`; keep `CHANGELOG.zh-CN.md` synchronized.

## Release integrity

- Keep versions in `package.json` and `package-lock.json` synchronized through `npm run version:set -- x.y.z`.
- A release tag must be exactly `vx.y.z`, and the matching changelog section must exist before the tag is pushed.
- Releases intentionally use no paid or trusted platform certificates. macOS uses ad-hoc signing only; Windows installers are unsigned. Do not add signing-secret requirements or imply Apple notarization or trusted publisher status.
- Keep untrusted-install warnings accurate. macOS application updates are check-and-download-manually; Windows may use the in-app updater.
