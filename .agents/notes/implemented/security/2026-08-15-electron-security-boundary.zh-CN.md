# Decision: 将官方 DSH 与 Electron 权限隔离

Status: implemented
Category: security

[English](2026-08-15-electron-security-boundary.md) | 简体中文

## 问题

官方 DSH Web 应用属于本地 Web 内容，而不是受信任的 Electron 主进程代码。向它提供 Node.js、preload、IPC、无限制导航或非回环网络访问会扩大安全事件影响，并违反桌面壳产品边界。

## 决定

官方 DSH 绑定 `127.0.0.1` 上的随机端口，Supervisor 只接受具有该精确主机和显式端口的 HTTP URL。DSH Window 没有 preload，也不暴露 Node.js 或 Electron API。Desktop 自有窗口使用狭窄且经过验证的 IPC，并保持禁用 Node integration、启用 context isolation 和 sandbox。适用窗口拒绝权限请求并限制导航和新窗口，特权操作保留在主进程，子进程禁止使用 shell。

## 考虑过的替代方案

**向 DSH Window 暴露共享 preload。** 即使桥接接口很小，也会为 Desktop 不拥有的内容建立特权 API 表面。

**接受 `localhost` 或任意回环地址形式。** 名称解析和其他地址形式会把可接受端点扩展到显式启动约定之外，使验证不够确定。

**允许通过 shell 启动进程。** 这会在没有产品需求的情况下增加 shell 解析和平台特有的注入行为。

## 影响

Desktop 不能通过特权集成增强官方页面，管理 UI 必须保留在独立的 Desktop 自有窗口。作为交换，官方页面中的安全问题或导航不会直接获得操作系统或 Electron 权限。

## 验证

Supervisor 测试拒绝不符合要求的 URL。`npm run audit:boundary` 拒绝不安全源码模式，以及 renderer、preload 和 shared 层之间被禁止的依赖。安装包 E2E 验证官方页面在最终应用中启动；代码审阅继续检查静态门禁无法完整证明的 BrowserWindow、IPC、导航和进程设置。
