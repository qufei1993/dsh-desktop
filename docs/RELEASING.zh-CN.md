[English](RELEASING.md) | 简体中文

# 发布指南

本指南面向 DSH Desktop 的发布维护者。项目明确发布没有受信任平台证书的社区构建，不要求购买开发者账号。

## 发布前条件

- `main` 上的构建、CodeQL 和依赖审查均通过。
- `package.json` 与 `package-lock.json` 中的版本一致。
- `CHANGELOG.md` 已把本次内容从“未发布”整理到对应版本。
- 已在至少一台真实机器上验证候选安装包。

发布不需要任何签名 Secrets。GitHub Actions 会关闭证书自动发现，只对 macOS Bundle 做 ad-hoc 签名，并生成未签名的 Windows 安装包。README 和 Release 说明必须持续披露相应的 Gatekeeper 与 SmartScreen 提示。

## 发布步骤

1. 运行 `npm run version:set -- x.y.z`，同步 `package.json` 与 lockfile 的版本。
2. 更新 `CHANGELOG.md`，把“未发布”内容整理到 `## [x.y.z] - YYYY-MM-DD`。
3. 运行 `npm run verify` 和当前平台的完整打包测试。
4. 合并发布改动并确认 `main` 的必需检查通过。
5. 在 `main` 当前提交创建并推送 `vx.y.z` 标签。
6. 等待 `build` 工作流完成跨平台构建；流水线会从 `CHANGELOG.md` 提取当前版本内容并创建 GitHub Release。
7. 下载并验证每类支持平台的安装包；Windows 另外发布自动更新所需的更新清单。
8. 在三类支持平台上完成安装、首次启动、不受信任发布者提示、版本管理和更新检查冒烟测试。

标签必须与 `package.json` 完全一致，例如应用版本 `0.2.0` 对应标签 `v0.2.0`。不一致时 Release 任务会失败。

可以在推送标签前本地验证 Release 文案：

```bash
npm run version:check
npm run release:notes -- v0.2.0 CHANGELOG.md
```

如果 Changelog 中没有对应版本章节，发布会失败，不会退回到无关的提交记录或空白说明。

## 发布资产

正式 Release 应至少包含：

- macOS arm64 DMG；
- macOS x64 DMG；
- Windows x64 NSIS EXE；
- Windows 应用内更新所需的 `latest.yml`。

不要手工替换已经发布的同名安装包。发现问题时撤下有问题的 Release，修复后发布新的补丁版本，确保自动更新元数据与二进制始终对应。

由于 macOS 自动安装更新要求 Apple 代码签名，macOS 应用只检测新版本并打开 GitHub Releases，由用户手动下载。Windows 保留由用户触发的应用内下载与安装。两个平台都不做静默更新。

## 回滚与安全发布

如果版本存在严重回归，先在 Release 页面明确标记并停止推荐，再发布修复版本。不要移动已有版本标签。

涉及未公开漏洞时，在 GitHub Security Advisory 的私有协作区准备修复和公告，发布时间与报告者协调。公开公告中避免披露不必要的用户数据或仍可利用的操作细节。
