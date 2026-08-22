# Decision: Isolate official DSH from Electron privileges

Status: implemented
Category: security

English | [简体中文](2026-08-15-electron-security-boundary.zh-CN.md)

## Problem

The official DSH web application is local web content, not trusted Electron main-process code. Giving it Node.js, preload, IPC, unrestricted navigation, or non-loopback network access would expand compromise impact and violate the desktop shell's product boundary.

## Decision

Official DSH binds to a random port on `127.0.0.1`, and the supervisor accepts only an HTTP URL with that exact host and an explicit port. The DSH window has no preload and exposes no Node.js or Electron API. Desktop-owned windows use narrow validated IPC, disabled Node integration, context isolation, and sandboxing. Navigation and new windows are constrained, permission requests are denied where applicable, privileged actions remain in the main process, and child processes run without a shell.

## Alternatives considered

**Expose a shared preload to the DSH window.** Even a small bridge would create a privileged API surface coupled to content the desktop project does not own.

**Accept `localhost` or arbitrary loopback forms.** Name resolution and alternate address forms would expand the accepted endpoint beyond the explicit launch contract and make validation less deterministic.

**Allow shell-based process launch.** This would add shell parsing and platform-specific injection behavior without a product requirement.

## Consequences

The Desktop cannot enhance the official page through privileged integrations and must keep management UI in separate Desktop-owned windows. In exchange, compromise or navigation inside the official page does not directly grant operating-system or Electron privileges.

## Verification

Supervisor tests reject nonconforming URLs. `npm run audit:boundary` rejects unsafe source patterns and forbidden renderer, preload, and shared-layer dependencies. Packaged E2E verifies the official page is launched in the shipped application, while code review traces BrowserWindow, IPC, navigation, and process settings that static checks cannot fully prove.
