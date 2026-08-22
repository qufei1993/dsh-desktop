---
name: dsh-desktop-pre-push
description: Select and run the required local evidence before pushing DSH Desktop changes, marking work ready for review, or claiming verification has passed.
---

# Verify DSH Desktop Changes Before Push

English (authoritative) | [简体中文（人工审阅）](SKILL.zh-CN.md)

Inspect the complete outgoing diff and preserve unrelated work. Always run `npm run verify`; it is intentionally the small project's common local baseline.

Add checks according to the affected surface:

- Bundled runtime preparation, official DSH startup, CLI resolution, package-manager behavior, or the DSH boundary: run `npm run test:official` after preparing the runtime.
- Packaging configuration, packaged resources, Electron startup, installer behavior, or packaged UI: build the current-platform installer and run `npm run test:packaged`.
- UI behavior: run the focused tests and record a screenshot or manual interaction result when packaged E2E does not cover the change.
- Release metadata or changelog extraction: run the focused release tests and the relevant metadata command against real build artifacts when available.
- Platform-specific code: run the available host-platform evidence and state which required platforms remain covered only by CI.

Do not repeat a passing command without a reason. Do not weaken checks, delete assertions, or use a narrower test solely to hide a failure. Report the exact commands executed, their outcomes, and any check that could not run.
