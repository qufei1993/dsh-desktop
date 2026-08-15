[English](CHANGELOG.md) | 简体中文

# 变更日志

本文件记录 DSH Desktop 的重要变化。版本号遵循[语义化版本](https://semver.org/lang/zh-CN/)。

## 未发布

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
- SHA-256 校验值、CycloneDX SBOM 和第三方许可证清单。

### 安全

- DSH 页面使用无 preload 的沙箱窗口，不暴露 Node.js 或 Electron API。
- DSH 本地服务地址限制为 `127.0.0.1`。
- 资源校验、精确版本安装和产品边界自动审计。
- 明确采用未购买平台证书的社区构建，并提供 SHA-256 校验值。
