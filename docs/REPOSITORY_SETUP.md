English | [简体中文](REPOSITORY_SETUP.zh-CN.md)

# GitHub Repository Setup Checklist

Repository files cannot reliably enable the settings below. A maintainer should configure them in the GitHub web interface before the repository becomes public.

## Repository details

- Description: `Community-maintained desktop client for DeepSeek Harness, with bundled Node.js and version management.`
- Website: point to the latest Release or project homepage.
- Topics: `deepseek`, `deepseek-harness`, `electron`, `desktop-app`, and `typescript`.
- Enable Issues. Enable Discussions later if the project needs community Q&A.
- Enable **Automatically delete head branches**.

## Security settings

- Enable Dependency graph, Dependabot alerts, and Dependabot security updates.
- Enable Private vulnerability reporting so that the private link in `SECURITY.md` works.
- Keep Secret scanning and Push protection enabled when supported by the repository type.
- Keep the default Actions token read-only. The release job requests `contents: write` separately.
- Configure and periodically rotate the signing secrets listed in the [release guide](RELEASING.md).

## Protect `main`

Create a ruleset that:

- blocks force pushes and branch deletion;
- requires changes to arrive through a pull request;
- requires at least one approval and dismisses stale approvals after new commits;
- requires all conversations to be resolved;
- requires the branch to be up to date;
- requires at least `verify`, all three platform `package` jobs, `Analyze TypeScript`, and `dependency-review`;
- applies to administrators, with an audited bypass reserved for security emergencies.

Run every workflow once after the repository becomes public, then add the exact check names displayed by GitHub to the ruleset. This avoids blocking merges because of a name mismatch.

## Issue labels

The templates reference these labels. Create them before launch:

- `bug`
- `enhancement`
- `needs-triage`
- `dependencies`
- `security`
- `documentation`
- `good first issue`
- `help wanted`

## Before the first release

- Confirm that every README link works from the public repository.
- Confirm that the name, icon, and independent community-maintenance statement do not imply official endorsement.
- Confirm that the copyright holder in `LICENSE` is correct.
- Test real macOS signing and notarization and Windows code signing.
- Test installation, uninstallation, and automatic updates on a clean machine without a development environment.
