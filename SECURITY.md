English | [简体中文](SECURITY.zh-CN.md)

# Security Policy

## Supported versions

DSH Desktop is still in its early `0.x` stage. Security fixes are guaranteed only in the latest release; older releases may not receive backports.

| Version | Security updates |
| --- | --- |
| Latest GitHub Release | Supported |
| Earlier releases | Not guaranteed |
| Unreleased source snapshots | Not guaranteed |

## Report a vulnerability privately

Do not open a public issue for a suspected vulnerability. Do not include real credentials, user data, or directly exploitable details in public channels.

Use **Security → Report a vulnerability** in the repository:

https://github.com/qufei1993/dsh-desktop/security/advisories/new

Include as much of the following as possible:

- affected version, operating system, and CPU architecture;
- impact and attack prerequisites;
- minimal reproduction steps or a proof of concept;
- a suggested fix, if available;
- whether the issue has also been reported to DeepSeek or an affected dependency.

Maintainers will aim to acknowledge the report within seven days and provide progress updates after validation. Resolution time depends on impact, complexity, and upstream dependencies. Avoid public disclosure until a fix is available.

## Security boundary

DSH Desktop owns the desktop client, bundled Node.js runtime, official DSH package installation, and local process supervision. Vulnerabilities inside the official `@deepseek-ai/dsh` package, model-service behavior, and user configuration generally belong upstream. If the boundary is unclear, report the issue privately and we will help route it.

The project will never ask for API keys, signing certificates, account passwords, or a complete user data directory through an issue or chat.
