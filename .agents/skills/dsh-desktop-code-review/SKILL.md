---
name: dsh-desktop-code-review
description: Review DSH Desktop changes or pull requests against its product boundary, Electron security model, process lifecycle, cross-platform behavior, bilingual UI, tests, and release obligations.
---

# Review DSH Desktop Changes

English (authoritative) | [简体中文（人工审阅）](SKILL.zh-CN.md)

Review the exact diff and enough surrounding code to understand its behavior. Read the root `AGENTS.md`, relevant active decision notes under `.agents/notes/implemented/`, and the affected tests before forming findings.

Prioritize correctness, security, lifecycle cleanup, and broken product requirements over formatting. Do not report a style issue already rejected by an executed gate unless it reveals a semantic defect.

## Review focus

- Preserve the official DSH ownership boundary: no patching, injection, private API imports, or ownership of DSH configuration and user data.
- Trace both sides of changed IPC. Renderer input is untrusted until validated in the main process; privileged operations stay behind narrow channels.
- Check every affected `BrowserWindow`: the official DSH window has no preload, and all windows keep Node integration disabled, context isolation enabled, sandboxing enabled, permission requests denied where applicable, and navigation constrained.
- Trace subprocess startup, readiness, timeout, cancellation, exit, version switching, and application shutdown. Confirm ownership and cleanup for every terminal path.
- Check macOS arm64, macOS x64, and Windows x64 assumptions, including path delimiters, executable names, process termination, packaging resources, and updater differences.
- Preserve exact-version installation, atomic publication, rollback availability, and separate user-controlled DSH/Desktop update channels.
- Check that all visible application text exists in Simplified Chinese and English.
- Require focused regression tests for behavior and the real shipped entry path for runtime, packaging, or boundary changes.
- Verify paired public documentation and changelogs when user-visible behavior changes.
- Challenge speculative abstractions and unrelated cleanup that expand the requested scope.

## Evidence and output

Use the narrowest relevant checks from `dsh-desktop-pre-push`; do not claim a check ran unless its output was observed. Report each defect with location, impact, triggering path, and evidence. Separate blocking findings from optional improvements. If no actionable defect is found, say so and state any remaining test or platform uncertainty.
