# DSH Desktop 决策记录

[English](README.md) | 简体中文

Decision Note 用于保存会影响产品归属、架构、安全、工程流程或测试策略的持久决策。它保留代码和现状文档无法独立安全表达的设计理由。

## 路径和生命周期

每份记录使用 `{lifecycle}/{category}/yyyy-mm-dd-topic.md` 路径。

生命周期：

- `proposed`：正在考虑但尚未完整落地的重要决策。
- `implemented`：已经反映在代码、测试和文档中的当前决策。
- `rejected`：经过考虑但被否决；只有当其理由仍能防止重复犯错时才保留。
- `archived`：已被完全替代或不再约束当前行为的历史 implemented 决策。

分类为 `architecture`、`product`、`process`、`security` 和 `testing`。

## 必需内容

每份英文记录以以下内容开头：

```markdown
# Decision: Title

Status: proposed | implemented | rejected
Category: architecture | product | process | security | testing
```

所有记录都包含 `Problem` 和 `Alternatives considered`。Proposed 记录增加 `Proposal`、`Acceptance criteria` 和 `Risks`；implemented 记录增加 `Decision`、`Consequences` 和 `Verification`；rejected 记录增加 `Proposal`，并在 `Consequences` 中说明拒绝原因。中文配对文件使用对应的中文标题，但状态、分类和路径保持一致。

只记录当前事实和长期有效的理由。不要写入任务清单、对话记录、临时调查、PR 叙述、发布日志或已经由用户文档负责的事实，应通过链接引用对应归属。

## 生命周期转换

- `proposed` → `implemented`：移动中英文文件，设置 `Status: implemented`，把未来时方案改写为已落地决定，并记录真实验证。
- `proposed` → `rejected`：移动中英文文件，设置 `Status: rejected`，保留方案被否决的原因。
- `implemented` → 新决策：当新旧决定仍同时约束当前行为时，新增或更新后继记录，并让两者相互链接。

## 什么时候归档

项目从一开始就保留 `archived/`，但应谨慎归档。只有同时满足以下条件，才能把 implemented 记录移动到 `archived/<category>/`：

1. 该决定已被完全替代，或者不再影响已发布行为、兼容性、安全、数据、发布流程或支持平台。
2. 仍然有效的每项理由和约束都已经由当前 Note 或公开文档接管。
3. 所有入站链接已经更新，不再有生效中的说明把归档 Note 当成当前依据。
4. 该记录仍具有历史价值；否则可以删除无意义的重复记录并修复链接。

记录年龄、数量、文件名变化和整理目录都不是归档理由。Proposal 永远不能归档，只能实施或拒绝。归档 Note 永远不能作为当前行为的依据。

归档时保留 `Status: implemented`，并在分类下方增加：

```markdown
Archived: YYYY-MM-DD
Superseded by: ../relative/path-to-current-owner.md
Archive reason: concise factual reason
```

中文文件使用对应中文说明，但保留相同日期和后继链接。归档后的中英文记录都是冻结历史证据，移动后不得继续修改设计主张。

创建、编辑、移动、拒绝或归档记录后运行 `npm run verify:agents`。
