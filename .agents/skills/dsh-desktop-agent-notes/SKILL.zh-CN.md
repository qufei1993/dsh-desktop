---
name: dsh-desktop-agent-notes
description: 创建、更新、转换、替代、拒绝或归档 DSH Desktop Decision Notes，同时保留当前依据和有价值的设计理由。
---

# 维护 DSH Desktop 决策记录

[English（权威版本）](SKILL.md) | 简体中文（人工审阅）

新增记录前，阅读 `.agents/notes/README.md` 并搜索生效中的 Notes。只有当一项持久的产品、架构、安全、流程或测试决策可能被未来维护者或 AI Agent 合理地重新讨论时，才需要 Decision Note。

每份 Note 都由英文文件和 `.zh-CN.md` 简体中文文件组成。创建、更新、移动、拒绝、替代或归档时，必须同时处理两份文件，并保持事实、链接、状态、分类和验证等价。

## 生命周期

- 尚未实现的重要决策从 `proposed/<category>/` 开始。
- 只有描述的行为已经发布后，才能把 proposal 移到 `implemented/<category>/`；同时把方案语言改写为描述当前事实的现在时。
- 被否决的方案移到 `rejected/<category>/` 并记录原因。只有在拒绝理由能防止重复犯错时才保留。
- 只有当 implemented Note 被完全替代或不再约束当前行为，而且仍然有效的事实都有当前归属时，才能移动到 `archived/<category>/`。

记录年龄、数量、文件重命名或整理目录的愿望都不是归档理由。归档前，更新入站链接、链接后继记录、增加归档日期和原因，并确认没有当前文档把归档 Note 当成依据。归档 Note 是历史证据，不能修改为当前指南。

每份 Note 都要说明问题、决定或方案、真实考虑过的替代方案、影响或风险以及验证。不得保存任务计划、会话记录、PR 叙述或 Changelog。任何生命周期改动后运行 `npm run verify:agents`。
