---
name: dsh-desktop-release
description: 在保持版本、Changelog、产物、平台、签名警告和独立更新通道完整性的前提下准备并验证 DSH Desktop 发布。
---

# 准备 DSH Desktop 发布

[English（权威版本）](SKILL.md) | 简体中文（人工审阅）

改变发布状态前，阅读 `AGENTS.md`、`docs/RELEASING.md`、`.agents/notes/implemented/` 下生效的发布流程决策，以及当前 GitHub workflow。

## 发布流程

1. 确认目标版本和发布范围。使用 `npm run version:set -- x.y.z`，不能只编辑一个版本文件。
2. 更新匹配的英文和简体中文 Changelog 章节，保持发布事实等价。
3. 运行 `npm run verify`，以及 `dsh-desktop-pre-push` 要求的相关官方 DSH 和安装包冒烟测试。
4. 验证每个生成的安装包都包含锁定的运行时、包管理器、官方 DSH 包、更新元数据、校验值、SBOM 和必需 UI 资源。
5. 推送标签前，验证发布标签精确为 `vx.y.z`，并且存在对应 Changelog 章节。
6. 分别报告 macOS arm64、macOS x64 和 Windows x64 的验证证据。

除非用户明确要求改变外部状态，否则不得创建或推送标签、发布 Release 或上传产物。不得增加签名密钥，也不得暗示 Apple 公证或受信任 Windows 发布者状态。官方 DSH 更新和 DSH Desktop 应用更新必须保持独立。
