English | [简体中文](RELEASING.zh-CN.md)

# Release Guide

This guide is for DSH Desktop release maintainers. Regular contributors do not need signing credentials.

## Prerequisites

- Build, CodeQL, and dependency-review checks pass on `main`.
- `package.json` and `package-lock.json` contain the same version.
- The release entries have been moved from **Unreleased** to the target version in both changelogs.
- macOS and Windows signing certificates are configured in GitHub Actions Secrets.
- The candidate installer has been tested on at least one physical machine.

The release workflow uses these secrets:

| Secret | Purpose |
| --- | --- |
| `MAC_CSC_LINK` | macOS Developer ID certificate content or secure download URL |
| `MAC_CSC_KEY_PASSWORD` | macOS certificate password |
| `APPLE_API_KEY_BASE64` | Base64-encoded App Store Connect API `.p8` private key |
| `APPLE_API_KEY_ID` | App Store Connect API key ID |
| `APPLE_API_ISSUER` | App Store Connect API issuer ID |
| `WIN_CSC_LINK` | Windows code-signing certificate content or secure download URL |
| `WIN_CSC_KEY_PASSWORD` | Windows certificate password |

Never place certificates, passwords, or temporary decrypted material in the repository, an issue, a pull request, or build logs. Tagged macOS builds require both signing and Apple notarization credentials. electron-builder signs, notarizes, and staples the application. A formal Release is not created when any required credential is missing.

## Publish a release

1. Run `npm run version:set -- x.y.z` to update both `package.json` and the lockfile.
2. Move the release notes from **Unreleased** to `## [x.y.z] - YYYY-MM-DD` in `CHANGELOG.md`, then update `CHANGELOG.zh-CN.md` with the equivalent Chinese notes.
3. Run `npm run verify` and the complete packaging test for the current platform.
4. Merge the release change and confirm all required `main` checks pass.
5. Create and push the `vx.y.z` tag from the current `main` commit.
6. Wait for the `build` workflow. It builds all platforms, extracts English release notes from `CHANGELOG.md`, merges platform checksums, and creates the GitHub Release.
7. Download the assets and verify `SHA256SUMS`, SBOMs, update metadata, and signatures.
8. Smoke-test installation, first launch, Version Manager, and update checks on all three supported platform targets.

The tag must exactly match `package.json`. For example, version `0.2.0` requires tag `v0.2.0`. The Release job fails when they differ.

Validate the release notes before pushing the tag:

```bash
npm run version:check
npm run release:notes -- v0.2.0 CHANGELOG.md
```

The release fails when the changelog does not contain the matching version section. It will not fall back to unrelated commit history or an empty description.

## Required assets

A formal Release should contain at least:

- macOS arm64 DMG, ZIP, blockmap, and update metadata;
- macOS x64 DMG, ZIP, blockmap, and update metadata;
- Windows x64 NSIS EXE, blockmap, and update metadata;
- `SHA256SUMS`;
- CycloneDX SBOMs for DSH Desktop and official DSH;
- `THIRD-PARTY-LICENSES.txt`.

Never replace an already published installer with a different file under the same name. Withdraw a defective Release and publish a new patch version so that update metadata and binaries remain consistent.

## Rollback and security releases

For a severe regression, mark the affected Release clearly, stop recommending it, and publish a fixed version. Do not move an existing version tag.

For an undisclosed vulnerability, prepare the fix and advisory in the private GitHub Security Advisory workspace and coordinate disclosure timing with the reporter. Avoid unnecessary user data or still-exploitable details in the public advisory.
