[English](REPOSITORY_SETUP.md) | 简体中文

# GitHub 仓库上线清单

以下设置无法仅通过仓库文件可靠开启，首次公开前由维护者在 GitHub 网页端完成。

## 基本信息

- Description：`Community-maintained desktop client for DeepSeek Harness, with bundled Node.js and version management.`
- Website：指向最新 Release 或项目主页。
- Topics：`deepseek`、`deepseek-harness`、`electron`、`desktop-app`、`typescript`。
- 启用 Issues；需要社区问答时再启用 Discussions。
- 启用 Automatically delete head branches。

## 安全设置

- 启用 Dependency graph、Dependabot alerts 和 Dependabot security updates。
- 启用 Private vulnerability reporting，确保 `SECURITY.md` 中的私密报告入口可用。
- 保持 Secret scanning 与 Push protection 开启（仓库类型支持时）。
- Actions 默认令牌使用只读权限；发布任务已在工作流内单独申请 `contents: write`。
- 在 README 和 Release 说明中持续保留未签名构建提示与校验值核对方法。

## `main` 分支保护

建议创建 Ruleset：

- 禁止强制推送和删除分支。
- 合并必须通过 Pull Request。
- 至少需要 1 次批准；新提交后撤销旧批准。
- 要求所有讨论解决后再合并。
- 要求分支保持最新。
- 必需检查至少包括 `verify`、三平台 `package`、`Analyze TypeScript` 和 `dependency-review`。
- 管理员也遵守规则；仅为安全热修复保留受审计的旁路权限。

仓库公开后先运行一次所有工作流，再把 GitHub 实际显示的检查名称加入 Ruleset，避免名称不一致导致无法合并。

## Issue 标签

模板会引用以下标签，首次上线时确保它们存在：

- `bug`
- `enhancement`
- `needs-triage`
- `dependencies`
- `security`
- `documentation`
- `good first issue`
- `help wanted`

## 首次发布前

- 确认 README 中所有链接可从公开仓库访问。
- 确认项目名称、图标和社区独立维护声明不会造成官方背书误解。
- 确认 LICENSE 中的版权所有者信息准确。
- 在干净机器上验证 macOS Gatekeeper 与 Windows SmartScreen 的未签名安装流程。
- 在没有开发环境的机器上验证安装、卸载、Windows 应用内更新和 macOS 手动下载更新。
