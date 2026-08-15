[English](CHANGELOG.md) | 简体中文

# 变更日志

本文件记录 DSH Desktop 的重要变化。版本号遵循[语义化版本](https://semver.org/lang/zh-CN/)。

## 未发布

## [0.2.0] - 2026-08-16

### 新增

- 支持检测更新的官方 DSH 包版本；在官方 DSH 窗口显示可关闭的更新提醒，并可从版本管理页直接更新。

## [0.1.0] - 2026-08-15

### 新增

- macOS Apple Silicon、macOS Intel 与 Windows x64 桌面应用。
- 随包 Node.js 24 LTS 与经过校验的官方 DSH 版本。
- npm 官方 DSH 全版本查询、安装、保留和切换。
- 启动时直达官方 DSH 页面，版本管理从系统菜单进入。
- DSH Desktop 通过 GitHub Releases 检查更新：macOS 手动下载，Windows 可在应用内安装。
- 自动跟随环境变量、系统代理或本机 `127.0.0.1:7890` 代理。
- 原生“关于 DSH Desktop”、版本管理菜单图标和右上角应用更新入口。
- 简体中文与 English 界面，可跟随系统语言或记住用户选择。

### 变更

- 发布包仅保留目标平台所需的 DSH 原生依赖，移除 Windows 调试符号并启用最高压缩，以减小下载体积。
- Release 下载列表收敛为三个平台安装包；Windows 仅保留自动更新所需的更新清单。

### 安全

- DSH 页面使用无 preload 的沙箱窗口，不暴露 Node.js 或 Electron API。
- DSH 本地服务地址限制为 `127.0.0.1`。
- 资源校验、精确版本安装和产品边界自动审计。
- 明确采用不购买平台证书的社区构建，macOS 使用 ad-hoc 签名。
