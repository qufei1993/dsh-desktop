# DSH Desktop AI Infrastructure

English | [简体中文](README.zh-CN.md)

This directory contains repository-local assets for AI-assisted engineering. It separates repeatable workflows from durable project decisions:

- `skills/` tells an AI agent how to perform a recurring repository task.
- `notes/` preserves why durable product and engineering decisions were made.

Standing requirements remain in the root `AGENTS.md`. Human-facing product and contributor documentation remains under `docs/` and in the repository root. Deterministic enforcement belongs in `scripts/`, `tests/`, and CI; a skill may select those checks but must not replace them with prose.

The complete maintenance model is documented in [`docs/AI_ENGINEERING.md`](../docs/AI_ENGINEERING.md).

Standard `AGENTS.md` and `SKILL.md` files are the authoritative AI instruction sources. Their `.zh-CN.md` siblings are equivalent human-review mirrors and are not separate workflows.

## Available workflows

- [`dsh-desktop-code-review`](skills/dsh-desktop-code-review/SKILL.md)
- [`dsh-desktop-pre-push`](skills/dsh-desktop-pre-push/SKILL.md)
- [`dsh-desktop-release`](skills/dsh-desktop-release/SKILL.md)
- [`dsh-desktop-doc-sync`](skills/dsh-desktop-doc-sync/SKILL.md)
- [`dsh-desktop-agent-notes`](skills/dsh-desktop-agent-notes/SKILL.md)

Run `npm run verify:agents` after changing this directory.
