<div align="center">
  <img src="build/icon-source.svg" width="112" alt="DSH Desktop 图标">
  <h1>DSH Desktop</h1>
  <p>让普通用户无需安装 Node.js，也能直接运行和管理官方 DeepSeek Harness。</p>

  [![构建状态](https://github.com/qufei1993/dsh-desktop/actions/workflows/build.yml/badge.svg)](https://github.com/qufei1993/dsh-desktop/actions/workflows/build.yml)
  [![最新版本](https://img.shields.io/github/v/release/qufei1993/dsh-desktop?display_name=tag)](https://github.com/qufei1993/dsh-desktop/releases/latest)
  [![许可证](https://img.shields.io/github/license/qufei1993/dsh-desktop)](LICENSE)
</div>

DSH Desktop 是由社区维护、面向 macOS 和 Windows 的 DeepSeek Harness 桌面客户端。应用自带 Node.js 24 LTS，可安装、保留和切换官方 `@deepseek-ai/dsh` 版本，并在独立窗口中运行官方 `dsh web` 页面。

> [!IMPORTANT]
> 本项目由社区独立维护，与 DeepSeek 官方无隶属关系。DSH Desktop 不修改 DeepSeek Harness；官方 DSH 仍按其自身许可证和行为运行。

## 下载与使用

前往 [GitHub Releases](https://github.com/qufei1993/dsh-desktop/releases/latest) 下载与你的系统匹配的安装包：

| 系统 | 安装包 |
| --- | --- |
| macOS Apple Silicon | `DSH-Desktop-*-arm64.dmg` |
| macOS Intel | `DSH-Desktop-*-x64.dmg` |
| Windows 10/11 x64 | `DSH-Desktop-Setup-*-x64.exe` |

安装并打开后，应用会直接进入官方 DeepSeek Harness 页面。需要安装或切换 DSH 版本时，从系统菜单打开“版本管理…”。

> [!NOTE]
> 项目尚处于早期阶段。如果 Releases 中暂时没有安装包，请等待首个公开版本，不建议普通用户从源码构建。

## 核心能力

- 内置 Node.js 24 LTS，无需配置系统 Node.js。
- 随安装包提供一个经过校验的官方 DSH 版本。
- 从 npm 官方仓库读取全部 DSH 历史版本，可搜索、安装和切换。
- 多个 DSH 版本并存，升级后仍可回到旧版本。
- DSH Desktop 可从 GitHub Releases 检查更新，由用户决定下载和重启安装。
- 支持简体中文和 English，可跟随系统语言或由用户手动切换。
- GitHub 更新、npm 版本查询和 DSH 包安装会统一跟随本机代理。
- macOS Apple Silicon、macOS Intel 和 Windows x64 独立构建。
- 发布物附带 SHA-256 校验值、两份 CycloneDX SBOM 和第三方许可证清单。

## 清晰的产品边界

DSH Desktop 只负责运行环境、版本管理和进程托管。它不会：

- fork、patch、重新编译或向官方 DSH 页面注入代码；
- 管理 API Key、模型、会话、插件、Skills 或 MCP；
- 读取、迁移、备份或删除 DSH 用户数据；
- 自动升级或强制替换用户选择的 DSH 版本；
- 将本地 DSH 服务暴露到局域网。

官方 DSH 与 DSH Desktop 使用两套独立更新通道：DSH 版本来自 npm，由用户主动安装；DSH Desktop 更新来自本仓库的 GitHub Releases，由用户决定是否下载和重启安装。

## 网络代理

网络访问依次使用以下策略：

1. 优先使用 `HTTPS_PROXY`、`HTTP_PROXY` 等明确设置的代理；
2. 其次跟随 macOS 或 Windows 系统代理；
3. 如果系统为直连，但检测到 `127.0.0.1:7890` 正在监听，则自动使用该本地代理，与 Skills Hub 的默认行为一致；
4. 以上均未发现时使用直连。

这套代理同时覆盖 DSH Desktop 的 GitHub 更新、npm 版本目录查询和官方 DSH 包下载。官方 DSH 的本地页面始终直接访问 `127.0.0.1`，不会绕到代理服务器。

## 安全与隐私

- 官方 DSH 进程只绑定 `127.0.0.1` 的随机端口。
- DSH 页面窗口不暴露 Electron 或 Node.js API。
- 管理窗口只拥有经过校验的最小 IPC 能力。
- 生产环境不覆盖 `DSH_HOME`，数据行为由官方 DSH 决定。
- 下载的 Node.js 运行时依据官方 SHA-256 清单校验，DSH 安装固定到精确版本。

发现安全问题时，请按[安全策略](SECURITY.md)私下报告，不要创建公开 Issue。

## 本地开发

仅开发者需要 Node.js 22.19+ 或 24+：

```bash
npm ci
npm run prepare:runtime
npm run dev
```

`prepare:runtime` 会下载并校验锁定的 Node.js 24 LTS，再使用该运行时安装随包 DSH。生成内容位于被 Git 忽略的 `build-resources/`。

提交改动前运行：

```bash
npm run verify
npm run test:official
```

`verify` 包含类型检查、自动测试、生产构建和产品边界审计。完整开发流程与变更要求见[贡献指南](CONTRIBUTING.md)。

## 架构概览

```text
Electron 主进程
  └─ 内置 Node.js 24 LTS
      └─ 官方 @deepseek-ai/dsh web --port 0
          └─ http://127.0.0.1:<随机端口>
              └─ 沙箱化 DSH 窗口
```

更完整的边界、进程模型和数据约束见[设计说明](docs/superpowers/specs/2026-08-15-dsh-desktop-design.md)。项目维护方式、支持范围和版本变化分别记录在[维护者说明](MAINTAINERS.md)、[支持指南](SUPPORT.md)与[变更日志](CHANGELOG.md)中。

准备维护或发布仓库时，请继续阅读[发布指南](docs/RELEASING.md)和[GitHub 仓库上线清单](docs/REPOSITORY_SETUP.md)。
