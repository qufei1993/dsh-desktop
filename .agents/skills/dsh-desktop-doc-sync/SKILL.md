---
name: dsh-desktop-doc-sync
description: Create, edit, or review paired English and Simplified Chinese DSH Desktop documentation and user-visible text without allowing commands, links, versions, or release facts to drift.
---

# Synchronize DSH Desktop Documentation

English (authoritative) | [简体中文（人工审阅）](SKILL.zh-CN.md)

Read the documentation section of `AGENTS.md` before editing. Public English Markdown is paired with a `.zh-CN.md` sibling; update both in the same change and preserve equivalent meaning, links, commands, versions, warnings, and release facts.

AI infrastructure README files, Decision Notes, `SKILL.md`, and `AGENTS.md` follow the same pairing rule. Standard English filenames remain the authoritative machine-instruction sources; `.zh-CN.md` mirrors exist for human review.

Use one document as the source for the current edit and translate the completed meaning once. Do not translate sentence-by-sentence while the source is still changing. Review both rendered structures after editing.

For visible application text, update both locales in the owning copy table and preserve matching interpolation parameters. Do not hide missing translations behind fallbacks.

For changelogs, keep matching version headings and release facts; GitHub Release notes continue to come from the English version section. For release, security, support, governance, and repository-setup documents, preserve operational commands and warnings exactly in meaning.

Run `npm run verify:agents` when AI infrastructure documentation changes and `npm run verify` before completion. State which document was the source side for the edit.
