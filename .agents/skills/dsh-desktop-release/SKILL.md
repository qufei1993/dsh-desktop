---
name: dsh-desktop-release
description: Prepare and verify a DSH Desktop release while preserving version, changelog, artifact, platform, signing-warning, and separate-update-channel integrity.
---

# Prepare a DSH Desktop Release

English (authoritative) | [简体中文（人工审阅）](SKILL.zh-CN.md)

Read `AGENTS.md`, `docs/RELEASING.md`, the active release-process decisions under `.agents/notes/implemented/`, and the current GitHub workflow before changing release state.

## Release workflow

1. Confirm the requested version and release scope. Use `npm run version:set -- x.y.z`; do not edit only one version file.
2. Update the matching English and Simplified Chinese changelog sections with equivalent release facts.
3. Run `npm run verify` and the relevant official-DSH and packaged smoke tests described by `dsh-desktop-pre-push`.
4. Verify each produced installer contains the pinned runtime, package manager, official DSH package, update metadata, checksums, SBOM, and required UI resources.
5. Verify the release tag is exactly `vx.y.z` and that its changelog section exists before a tag is pushed.
6. Report platform evidence separately for macOS arm64, macOS x64, and Windows x64.

Do not create or push a tag, publish a release, or upload artifacts unless the user explicitly requests that external state change. Do not add signing secrets or imply Apple notarization or trusted Windows publisher status. Keep official DSH updates separate from DSH Desktop application updates.
