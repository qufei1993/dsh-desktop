English | [简体中文](RELEASING.zh-CN.md)

# Release Guide

This guide is for DSH Desktop release maintainers. The project intentionally publishes community builds without trusted platform certificates and does not require paid developer accounts.

## Prerequisites

- Build, CodeQL, and dependency-review checks pass on `main`.
- `package.json` and `package-lock.json` contain the same version.
- The release entries have been moved from **Unreleased** to the target version in both changelogs.
- The candidate installer has been tested on at least one physical machine.

No signing secrets are required. GitHub Actions disables certificate discovery, applies only an ad-hoc signature to macOS bundles, and produces unsigned Windows installers. Release notes and the README must continue to disclose the resulting Gatekeeper and SmartScreen warnings.

## Publish a release

1. Run `npm run version:set -- x.y.z` to update both `package.json` and the lockfile.
2. Move the release notes from **Unreleased** to `## [x.y.z] - YYYY-MM-DD` in `CHANGELOG.md`, then update `CHANGELOG.zh-CN.md` with the equivalent Chinese notes.
3. Run `npm run verify` and the complete packaging test for the current platform.
4. Merge the release change and confirm all required `main` checks pass.
5. Create and push the `vx.y.z` tag from the current `main` commit.
6. Wait for the `build` workflow. It builds all platforms, extracts English release notes from `CHANGELOG.md`, and creates the GitHub Release.
7. Download and verify the installer for each supported platform; Windows also publishes its update manifest.
8. Smoke-test installation, first launch, Version Manager, untrusted-publisher warnings, and update checks on all three supported platform targets.

The tag must exactly match `package.json`. For example, version `0.2.0` requires tag `v0.2.0`. The Release job fails when they differ.

Validate the release notes before pushing the tag:

```bash
npm run version:check
npm run release:notes -- v0.2.0 CHANGELOG.md
```

The release fails when the changelog does not contain the matching version section. It will not fall back to unrelated commit history or an empty description.

## Required assets

A formal Release should contain at least:

- macOS arm64 DMG;
- macOS x64 DMG;
- Windows x64 NSIS EXE;
- `latest.yml` for the Windows in-app updater.

Never replace an already published installer with a different file under the same name. Withdraw a defective Release and publish a new patch version so that update metadata and binaries remain consistent.

Because macOS automatic installation requires Apple code signing, the macOS app only detects a new version and opens GitHub Releases for manual download. Windows retains the user-controlled in-app download and install flow. Neither platform performs a silent update.

## Rollback and security releases

For a severe regression, mark the affected Release clearly, stop recommending it, and publish a fixed version. Do not move an existing version tag.

For an undisclosed vulnerability, prepare the fix and advisory in the private GitHub Security Advisory workspace and coordinate disclosure timing with the reporter. Avoid unnecessary user data or still-exploitable details in the public advisory.
