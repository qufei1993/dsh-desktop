# Decision: Install exact official DSH versions in isolated directories

Status: implemented
Category: architecture

English | [简体中文](2026-08-15-isolated-exact-dsh-versions.zh-CN.md)

## Problem

Users need to install, retain, switch, and roll back official DSH versions without global package state, partial installs, or an update silently replacing their selected version.

## Decision

Every managed DSH version is an exact SemVer from the official `@deepseek-ai/dsh` npm package and has its own application-owned directory. Installation occurs in a temporary directory, validates the package and CLI entry, and publishes the completed directory atomically. Multiple complete versions may coexist. Installation does not change the selected version unless the user explicitly requests installation and launch or later selects it.

## Alternatives considered

**One mutable installation.** Updating in place would make rollback harder and could leave the only installation unusable after interruption.

**Installing a moving dist-tag directly.** A tag such as `latest` would make the installed result time-dependent and weaken auditability.

**Global npm installation.** This would couple behavior to system permissions, PATH, Node.js, and unrelated user packages.

## Consequences

The application uses more disk space and must enumerate and clean its own version directories. In exchange, installs are reproducible, interrupted work cannot overwrite a working version, and user-controlled rollback remains available.

## Verification

Version-manager tests cover exact-version validation, temporary-directory cleanup, atomic publication behavior, uninstall ownership, and selection behavior. Packaged E2E exercises the shipped version-management path.
