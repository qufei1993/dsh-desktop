# DSH Desktop Decision Notes

English | [简体中文](README.zh-CN.md)

Decision Notes are durable records for choices that affect product ownership, architecture, security, engineering process, or testing strategy. They preserve rationale that code and current-state documentation cannot express safely on their own.

## Path and lifecycle

Each note uses `{lifecycle}/{category}/yyyy-mm-dd-topic.md`.

Lifecycle values:

- `proposed`: a substantial decision under consideration but not fully shipped.
- `implemented`: the current decision reflected by shipped code, tests, and documentation.
- `rejected`: a considered proposal that was declined; retain it only while its reasoning prevents a plausible repeated mistake.
- `archived`: an implemented historical decision that is fully superseded or no longer constrains current behavior.

Categories are `architecture`, `product`, `process`, `security`, and `testing`.

Every Decision Note has an English source and a `.zh-CN.md` Simplified Chinese counterpart in the same directory. Lifecycle moves, successor links, archive metadata, and factual updates apply to both files in the same change.

## Required content

Every note starts with:

```markdown
# Decision: Title

Status: proposed | implemented | rejected
Category: architecture | product | process | security | testing
```

All notes include `Problem` and `Alternatives considered`. Proposed notes add `Proposal`, `Acceptance criteria`, and `Risks`. Implemented notes add `Decision`, `Consequences`, and `Verification`. Rejected notes add `Proposal` and explain the rejection in `Consequences`.

The Chinese counterpart uses equivalent Chinese section headings while preserving the same `Status`, `Category`, dates, successor links, commands, and technical facts.

Write current facts and durable rationale. Do not include task checklists, conversation transcripts, temporary investigation notes, PR narration, release logs, or facts already owned by user documentation. Link to the owning source instead of copying it.

## Lifecycle transitions

- `proposed` to `implemented`: move the file, set `Status: implemented`, replace future-tense proposal material with the shipped decision, and record actual verification.
- `proposed` to `rejected`: move the file, set `Status: rejected`, and preserve why the proposal lost.
- `implemented` to a new decision: add or update the successor and cross-link both while both still constrain current behavior.

## When to archive

Create and retain `archived/` from the start, but archive sparingly. An implemented note may move to `archived/<category>/` only when all of the following are true:

1. Its decision is fully superseded or no longer affects shipped behavior, compatibility, security, data, release procedure, or supported platforms.
2. A current note or public document owns every rationale and constraint that still matters.
3. All inbound links are updated so no active instruction treats the archived note as current authority.
4. The archive still has historical value; otherwise a redundant note may be deleted with its links repaired.

Age, note count, filename changes, and tree tidiness are never sufficient reasons. Never archive a proposal: implement or reject it. Never use an archived note to justify current behavior.

When archiving, retain `Status: implemented` and add directly below the category:

```markdown
Archived: YYYY-MM-DD
Superseded by: ../relative/path-to-current-owner.md
Archive reason: concise factual reason
```

Archived notes are frozen historical evidence. Do not update their design claims after the move.

Run `npm run verify:agents` after creating, editing, moving, rejecting, or archiving a note.
