---
name: dsh-desktop-doc-sync
description: 创建、修改或审阅 DSH Desktop 成对的英文与简体中文文档和用户可见文本，防止命令、链接、版本或发布事实发生漂移。
---

# 同步 DSH Desktop 文档

[English（权威版本）](SKILL.md) | 简体中文（人工审阅）

编辑前阅读 `AGENTS.md` 的文档规则。公开英文 Markdown 与 `.zh-CN.md` 文件配对；在同一改动中更新两者，并保持含义、链接、命令、版本、警告和发布事实等价。

AI 基础设施 README、Decision Notes、`SKILL.md` 和 `AGENTS.md` 遵循相同配对规则。标准英文文件名是 AI 权威指令源；`.zh-CN.md` 镜像用于人工审阅。

本次编辑选择一种语言作为来源，完成其含义后一次性翻译。来源仍在变化时，不要逐句来回翻译。编辑后检查两边渲染结构。

用户可见文本需要同时更新所属文案表中的两个 locale，并保持插值参数一致。不得用 fallback 隐藏翻译缺失。

Changelog 两边必须保持匹配的版本标题和发布事实；GitHub Release Notes 继续从英文版本章节提取。发布、安全、支持、治理和仓库设置文档中的操作命令与警告必须准确等义。

修改 AI 基础设施文档时运行 `npm run verify:agents`，完成前运行 `npm run verify`。报告本次编辑以哪一种语言为来源。
