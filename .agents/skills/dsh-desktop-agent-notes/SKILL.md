---
name: dsh-desktop-agent-notes
description: Create, update, transition, supersede, reject, or archive DSH Desktop decision notes while preserving current authority and useful design rationale.
---

# Maintain DSH Desktop Decision Notes

English (authoritative) | [简体中文（人工审阅）](SKILL.zh-CN.md)

Read `.agents/notes/README.md` and search active notes before adding one. A note is justified only for a durable product, architecture, security, process, or testing decision that a future maintainer or AI agent could reasonably revisit.

Every note is an English file paired with a `.zh-CN.md` Simplified Chinese counterpart. Create, update, move, reject, supersede, or archive both files together with equivalent facts, links, status, category, and verification.

## Lifecycle

- Start substantial unimplemented decisions in `proposed/<category>/`.
- Move a proposal to `implemented/<category>/` only when the described behavior is shipped; rewrite proposal language into present-tense reality.
- Move a declined proposal to `rejected/<category>/` and record the reason. Rejected notes preserve useful evidence against repeating the same proposal.
- Move an implemented note to `archived/<category>/` only when it is fully superseded or no longer constrains current behavior and a current owner exists for every still-relevant fact.

Age, note count, a renamed file, or a desire to tidy the tree is not sufficient reason to archive. Before archiving, update inbound links, link the successor, add the archive date and reason, and confirm no current documentation treats the archived note as authority. Archived notes are historical evidence and must not be edited into current guidance.

Every note states the problem, decision or proposal, genuine alternatives considered, consequences or risks, and verification. Do not store task plans, session transcripts, PR narration, or changelog entries in decision notes. Run `npm run verify:agents` after any lifecycle change.
