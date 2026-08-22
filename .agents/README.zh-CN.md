# DSH Desktop AI 基础设施

[English](README.md) | 简体中文

本目录保存 DSH Desktop 面向 AI 辅助工程的仓库级资产，并将可复用工作流与持久项目决策分开：

- `skills/` 告诉 AI Agent 如何执行反复出现的仓库任务。
- `notes/` 保存重要产品与工程决策背后的理由。

常驻要求继续放在根目录 `AGENTS.md`。面向人的产品和贡献文档继续放在 `docs/` 与仓库根目录。确定性门禁放在 `scripts/`、`tests/` 和 CI；Skill 可以选择这些检查，但不能用文字说明替代检查。

完整维护模型见 [`docs/AI_ENGINEERING.zh-CN.md`](../docs/AI_ENGINEERING.zh-CN.md)。

标准 `AGENTS.md` 和 `SKILL.md` 文件是 AI 权威指令源；对应 `.zh-CN.md` 文件是等义的人工审阅镜像，不代表另一套工作流。

## 可用工作流

- [`dsh-desktop-code-review`](skills/dsh-desktop-code-review/SKILL.md)
- [`dsh-desktop-pre-push`](skills/dsh-desktop-pre-push/SKILL.md)
- [`dsh-desktop-release`](skills/dsh-desktop-release/SKILL.md)
- [`dsh-desktop-doc-sync`](skills/dsh-desktop-doc-sync/SKILL.md)
- [`dsh-desktop-agent-notes`](skills/dsh-desktop-agent-notes/SKILL.md)

修改本目录后运行 `npm run verify:agents`。
