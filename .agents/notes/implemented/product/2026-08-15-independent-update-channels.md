# Decision: Keep DSH and Desktop updates independent and user-controlled

Status: implemented
Category: product

English | [简体中文](2026-08-15-independent-update-channels.zh-CN.md)

## Problem

The official DSH package and the Desktop application have different publishers, compatibility risks, installation locations, and rollback behavior. Treating them as one update stream could silently replace the user's selected DSH version or imply that a Desktop release controls official DSH data compatibility.

## Decision

Official DSH versions come only from the official npm package and are installed or selected through explicit user actions. DSH Desktop application updates come only from this repository's GitHub Releases. Discovering a newer DSH version shows a dismissible notice but does not install or switch it. macOS Desktop updates use check-and-download-manually behavior; Windows may use the in-app updater.

## Alternatives considered

**Automatically install the latest DSH version.** This would consume bandwidth, change local program state without approval, and blur the distinction between checking and installing.

**Automatically switch after installation.** This would replace the user's active version and could expose official data to a version the user did not choose to run.

**Use one updater for both products.** This would conflate independent release authorities, artifacts, rollback units, and compatibility promises.

## Consequences

Users make more explicit choices and may continue running an older DSH version. In exchange, updates are predictable, rollback remains possible, and neither channel silently changes the other.

## Verification

Controller and updater tests verify check-only behavior, explicit installation and switching, dismissal, manual macOS delivery, and application-update state. Packaged E2E covers the user-facing version manager.
