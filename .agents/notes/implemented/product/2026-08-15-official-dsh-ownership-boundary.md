# Decision: Keep official DSH behavior and data outside Desktop ownership

Status: implemented
Category: product

English | [简体中文](2026-08-15-official-dsh-ownership-boundary.zh-CN.md)

## Problem

A desktop shell can easily become an unofficial fork by patching the bundled package, injecting UI, depending on private APIs, or taking responsibility for official configuration and user data. That would create incompatible behavior and ambiguous support ownership.

## Decision

DSH Desktop owns only its bundled runtime, exact official DSH installations, application state, process supervision, desktop windows, and its own update channel. It does not fork, patch, rebuild, inject into, or import private modules from official DSH. It does not manage DSH models, credentials, sessions, plugins, Skills, MCP, permissions, configuration, or user data. Production code does not override `DSH_HOME`.

## Alternatives considered

**Patch incompatible official releases.** This could hide upstream problems temporarily but would create a private distribution whose behavior and support obligations differ from official DSH.

**Expose DSH configuration in the desktop manager.** This would duplicate official ownership, require tracking private formats, and risk corrupting or misrepresenting user data.

**Inject desktop controls into the official web page.** This would make the shell depend on official DOM and implementation details and would alter the interface the project promises to preserve.

## Consequences

DSH Desktop cannot privately repair official data or plugin incompatibilities and must surface upstream failures honestly. In exchange, official behavior remains attributable, versions remain replaceable, and the community shell has a narrow maintenance boundary.

## Verification

`npm run audit:boundary` checks production sources for prohibited imports and selected unsafe configuration. Official and packaged smoke tests launch the unmodified package through its public CLI and verify the official bootstrap marker.
