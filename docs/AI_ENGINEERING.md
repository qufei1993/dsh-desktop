English | [简体中文](AI_ENGINEERING.zh-CN.md)

# AI Engineering Infrastructure

DSH Desktop treats AI-assisted development as an engineering workflow with explicit sources of truth, durable decision memory, and executable verification. The objective is not to accumulate prompts. It is to help human and AI contributors make consistent changes without weakening the boundary around official DeepSeek Harness.

## Information architecture

Each kind of information has one owner:

| Location | Responsibility |
| --- | --- |
| `AGENTS.md` | Short standing requirements that apply to every AI-assisted task |
| `.agents/skills/` | Repeatable workflows for a specific kind of repository task |
| `.agents/notes/` | Durable rationale, alternatives, and consequences for significant decisions |
| `docs/` and root Markdown | Human-facing product, contributor, support, security, and release documentation |
| `scripts/`, `tests/`, and CI | Deterministic enforcement and observable evidence |

A fact should have one authoritative home. Other files link to that owner instead of copying the same rationale. Skills select and interpret executable checks; they do not replace checks with instructions.

AI infrastructure documentation, Decision Notes, `AGENTS.md`, and every `SKILL.md` use paired English and `.zh-CN.md` files. Standard English filenames remain the authoritative machine-instruction sources so an agent loads one unambiguous workflow; Chinese mirrors let maintainers review the same rules directly.

## Repository layout

```text
.agents/
├── README.md
├── skills/
│   ├── dsh-desktop-agent-notes/SKILL.md
│   ├── dsh-desktop-code-review/SKILL.md
│   ├── dsh-desktop-doc-sync/SKILL.md
│   ├── dsh-desktop-pre-push/SKILL.md
│   └── dsh-desktop-release/SKILL.md
└── notes/
    ├── README.md
    ├── proposed/
    ├── implemented/
    ├── rejected/
    └── archived/
```

The structure is intentionally small. Add a workflow or decision only when it will change future engineering decisions; do not mirror the size of the upstream monorepo.

## Skills

A Skill is a focused procedure loaded for a matching task. Its YAML description provides discovery, while its body contains repository-specific choices and stopping conditions.

| Skill | Use it when |
| --- | --- |
| `dsh-desktop-code-review` | Reviewing a change or pull request |
| `dsh-desktop-pre-push` | Preparing to push, request review, or report verification |
| `dsh-desktop-release` | Preparing or verifying a release |
| `dsh-desktop-doc-sync` | Editing paired documentation or visible bilingual text |
| `dsh-desktop-agent-notes` | Creating, transitioning, superseding, rejecting, or archiving a decision note |

Skills contain only guidance that changes behavior in this repository. Generic coding advice, product facts already owned elsewhere, and copied command inventories do not belong in a Skill. Deterministic repeated work belongs in a script.

## Decision Notes

A Decision Note is appropriate when a change establishes or revises a durable product, architecture, security, process, or testing choice that a future maintainer could reasonably revisit. Notes are internal engineering records and do not replace public documentation or changelogs.

The path encodes lifecycle and category:

```text
.agents/notes/<lifecycle>/<category>/yyyy-mm-dd-topic.md
```

Supported categories are `architecture`, `product`, `process`, `security`, and `testing`.

### Lifecycle

- `proposed`: substantial future decision that is not fully shipped.
- `implemented`: current decision reflected in code, tests, and documentation.
- `rejected`: considered proposal retained because its rejection prevents a plausible repeated mistake.
- `archived`: frozen historical decision that is no longer current authority.

Move a proposal to `implemented` only after it ships, rewriting it in the present tense and recording actual verification. Move a declined proposal to `rejected`; proposals are never archived.

### When to archive

The `archived/` lifecycle exists from the start, but age and volume are not archive criteria. Archive an implemented note only when:

1. The decision is fully superseded or no longer affects shipped behavior, compatibility, security, data, release procedure, or supported platforms.
2. A current note or public document owns every rationale and constraint that still matters.
3. Inbound links have been repaired so active instructions do not treat the archived note as authority.
4. The old note still has historical value; otherwise remove a redundant record and repair its links.

The archived file retains `Status: implemented` and adds an archive date, successor link, and factual archive reason. Archived notes are frozen. Current code and active notes, not the archive, define present behavior.

The complete format and transition rules live in [`.agents/notes/README.md`](../.agents/notes/README.md).

## Initial decision inventory

The initial implemented notes extract the durable rationale from the original design specification:

- official DSH behavior and data remain outside Desktop ownership;
- official DSH runs with a pinned independent Node.js runtime;
- exact DSH versions are installed into isolated directories;
- official DSH and Desktop application updates use separate user-controlled channels;
- the official DSH window is isolated from Electron privileges.

These notes are the current rationale owners. The design specification remains a useful whole-system overview.

## Executable enforcement

`npm run verify:agents` validates:

- the required repository Skills exist;
- each Skill has valid frontmatter and a matching directory name;
- `AGENTS.md` and every Skill have Simplified Chinese human-review mirrors with matching Skill identities;
- every decision note uses a supported lifecycle, category, filename, status, and section set;
- every AI infrastructure document and Decision Note has a Simplified Chinese counterpart with matching lifecycle and category metadata;
- archived notes include archive metadata and retain implemented status;
- no unfinished scaffold markers remain in a Skill.

`npm run verify` runs this gate before type checking, tests, the production build, and the existing product-boundary audit. The validator itself has focused tests for valid repository state, skill identity, and archive rules.

Structural validation cannot judge whether prose is accurate. Reviewers must still compare a Skill or note with the owning code, tests, public documentation, and current product boundary.

## Maintenance workflow

### Add or change a Skill

1. Confirm the workflow will recur and needs repository-specific judgment.
2. Use a lowercase action-oriented directory name and matching frontmatter `name`.
3. Write a discriminating `description` that identifies when the workflow applies.
4. Keep the entrypoint focused; add `references/` or `scripts/` only when they have a concrete recurring use.
5. Update this document and run `npm run verify:agents` plus `npm run verify`.

### Add or change a Decision Note

1. Search active notes for the current owner and possible supersession.
2. Choose lifecycle and category from the closed sets.
3. Record the problem, actual proposal or decision, genuine alternatives, consequences or risks, and verification.
4. Update links and the previous owner when a decision is partially or fully superseded.
5. Apply the archive criteria instead of using age or note count.
6. Run `npm run verify:agents` plus the checks that prove the affected behavior.

## Deliberate limits

This infrastructure does not grant an AI agent additional authority. It does not permit publishing, pushing, tagging, deleting user data, or changing external state without the user's request. It also does not move product behavior into prompts: official DSH boundaries, Electron security, version behavior, and release integrity continue to be enforced by source code, tests, scripts, and CI.
