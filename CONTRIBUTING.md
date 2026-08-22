English | [简体中文](CONTRIBUTING.zh-CN.md)

# Contributing

Thank you for helping improve DSH Desktop. Bug reports, documentation fixes, tests, and code contributions are welcome.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md). Report vulnerabilities privately according to the [Security Policy](SECURITY.md); do not open a public issue for a security concern.

## Before you start

Open a Feature Request before implementing a large change. Describe the user problem, product boundaries, and alternatives so that maintainers can confirm the direction before significant work begins. Small fixes and documentation improvements may go directly to a pull request.

The project maintains these boundaries:

- Do not fork, modify, inject into, or rebuild official DeepSeek Harness.
- Do not depend on private DSH APIs.
- Do not take ownership of DSH models, keys, sessions, Skills, MCP, or its data directory.
- Do not expose the DSH service beyond the loopback interface.
- Install only exact versions of the official `@deepseek-ai/dsh` npm package.

Changes outside these boundaries will not be merged.

## Development environment

You need macOS or Windows, Node.js 22.19+ or 24+, npm 10+, and Git.

```bash
git clone https://github.com/qufei1993/dsh-desktop.git
cd dsh-desktop
npm ci
npm run prepare:runtime
npm run dev
```

`prepare:runtime` downloads the relatively large runtime and official DSH package. They remain under `build-resources/` and must not be committed.

## Make a change

1. Create a short-lived branch from the latest `main`.
2. Keep the change focused, and add tests and documentation for behavioral changes.
3. Do not commit secrets, signing certificates, user data, build directories, or installers.
4. Use a clear commit message in the form `type: short description`, such as `fix: clean up the process after version switching`.
5. Complete local verification before opening a pull request.

Recommended commit types are `feat`, `fix`, `docs`, `test`, `refactor`, `build`, and `chore`.

## AI-assisted engineering

Repository-local AI workflows and durable decision records live under `.agents/`. Contributors using an AI agent should follow the matching repository Skill for code review, pre-push verification, releases, bilingual documentation, and decision-note maintenance. Significant product, architecture, security, process, or testing decisions should add or update a Decision Note; routine task plans and change summaries should not.

See [AI Engineering Infrastructure](docs/AI_ENGINEERING.md) for the information model, available workflows, decision lifecycle, archive criteria, and validation rules.

## Verify the change

Run at least:

```bash
npm run verify
```

Changes involving the bundled runtime, DSH startup, or packaging should also run:

```bash
npm run test:official
npm run test:packaged
```

`test:packaged` requires an installer built for the current platform. If a platform test is unavailable, explain why and list the alternative checks completed in the pull request.

## Pull request requirements

- Explain the problem, approach, and user-visible behavior.
- Link the related issue, or provide enough context when no issue exists.
- List the tests that were actually run.
- Include screenshots or a recording for UI changes.
- Explain dependency changes and commit the updated `package-lock.json`.
- Avoid unrelated formatting or refactoring.
- Record user-visible changes under **Unreleased** in both `CHANGELOG.md` and `CHANGELOG.zh-CN.md`.

Maintainers may ask for an oversized pull request to be split. The merge strategy depends on the commit history and will usually be squash merge.

## Releases

Maintainers publish public releases. Versions follow Semantic Versioning, and the Git tag must be `v<version from package.json>`. A pushed tag triggers verification, cross-platform packaging, checksums, SBOM generation, and GitHub Release creation.

Signing keys and notarization credentials belong only in GitHub Actions Secrets. Never place them in the repository, logs, or issues.
