[English](AI_ENGINEERING.md) | 简体中文

# AI 工程基础设施

DSH Desktop 将 AI 辅助开发视为一套具有明确信息来源、持久决策记忆和可执行验证的工程流程。目标不是积累提示词，而是帮助人类和 AI 贡献者持续做出一致的改动，同时不削弱官方 DeepSeek Harness 的边界。

## 信息架构

每类信息只有一个归属位置：

| 位置 | 职责 |
| --- | --- |
| `AGENTS.md` | 适用于所有 AI 辅助任务的简短常驻规则 |
| `.agents/skills/` | 面向特定仓库任务的可复用工作流 |
| `.agents/notes/` | 重要决策的持久理由、替代方案和影响 |
| `docs/` 和根目录 Markdown | 面向人的产品、贡献、安全、支持和发布文档 |
| `scripts/`、`tests/` 和 CI | 确定性门禁和可观察证据 |

每项事实应当只有一个权威归属，其他文件通过链接引用，不重复复制理由。Skill 负责选择和解释可执行检查，不能用文字说明代替检查。

AI 基础设施说明、Decision Notes、`AGENTS.md` 和每个 `SKILL.md` 都使用英文与 `.zh-CN.md` 配对文件。标准英文文件名继续作为 AI 权威指令源，确保 Agent 只加载一套无歧义工作流；中文镜像让维护者可以直接审阅相同规则。

## 仓库结构

```text
.agents/
├── README.md
├── skills/
│   ├── dsh-desktop-agent-notes/SKILL.md
│   ├── dsh-desktop-code-review/SKILL.md
│   ├── dsh-desktop-doc-sync/SKILL.md
│   ├── dsh-desktop-pre-push/SKILL.md
│   └── dsh-desktop-release/SKILL.md
└── notes/
    ├── README.md
    ├── proposed/
    ├── implemented/
    ├── rejected/
    └── archived/
```

这个结构刻意保持精简。只有当某个工作流或决策会影响未来工程判断时才添加记录，不照搬上游大型 monorepo 的数量和复杂度。

## Skills

Skill 是在匹配任务中加载的聚焦流程。YAML 描述用于发现，正文保存本仓库特有的选择、风险和停止条件。

| Skill | 使用场景 |
| --- | --- |
| `dsh-desktop-code-review` | 审查改动或 Pull Request |
| `dsh-desktop-pre-push` | 推送、请求审阅或报告验证结果之前 |
| `dsh-desktop-release` | 准备或验证发布 |
| `dsh-desktop-doc-sync` | 修改双语文档或用户可见双语文本 |
| `dsh-desktop-agent-notes` | 创建、转换、替代、拒绝或归档决策记录 |

Skill 只保存会改变本仓库工作方式的指导。通用编码建议、已经由其他文档负责的产品事实和复制的命令清单不属于 Skill。需要重复且确定执行的工作应当实现为脚本。

## 决策记录

当一项改动建立或修改持久的产品、架构、安全、流程或测试决策，并且未来维护者很可能重新讨论它时，应当创建或更新 Decision Note。它们属于内部工程记录，不能替代公开文档或 Changelog。

路径同时表达生命周期和分类：

```text
.agents/notes/<lifecycle>/<category>/yyyy-mm-dd-topic.md
```

支持的分类为 `architecture`、`product`、`process`、`security` 和 `testing`。

### 生命周期

- `proposed`：尚未完整实现的重要未来决策。
- `implemented`：已经反映在代码、测试和文档中的当前决策。
- `rejected`：经过考虑但被否决，因为其理由仍能防止重复犯错而保留。
- `archived`：不再代表当前规则的冻结历史决策。

只有方案真实落地后，才能把 proposed 移到 implemented；移动时要改写为现在时并记录实际验证。被否决的方案移到 rejected，不能归档 proposal。

### 什么时候归档

项目从一开始就建立 `archived/`，但记录年龄和数量不是归档条件。只有同时满足以下条件，才能归档 implemented 记录：

1. 决策已经被完全替代，或者不再影响已发布行为、兼容性、安全、数据、发布流程或支持平台。
2. 仍然有效的理由和约束已经由当前记录或公开文档接管。
3. 所有入站链接已经修复，任何生效中的规则都不会把归档记录当成当前依据。
4. 旧记录仍具有历史价值；没有历史价值的重复记录可以删除，同时修复链接。

归档文件继续保留 `Status: implemented`，并增加归档日期、后继记录链接和客观归档原因。归档后内容冻结。当前代码和生效中的 Notes 才定义现状，archive 不定义现状。

完整格式和状态转换规则见 [`.agents/notes/README.md`](../.agents/notes/README.md)。

## 首批决策清单

首批 implemented Notes 从原始设计说明中提炼出长期有效的理由：

- 官方 DSH 的行为和数据不属于 Desktop 管理范围；
- 官方 DSH 使用锁定的独立 Node.js 运行时；
- 精确 DSH 版本安装在相互隔离的目录中；
- 官方 DSH 和 Desktop 应用使用相互独立、由用户控制的更新通道；
- 官方 DSH 窗口与 Electron 权限隔离。

这些 Notes 是当前设计理由的归属位置。原始设计说明继续作为全系统概览。

## 可执行门禁

`npm run verify:agents` 检查：

- 必需的仓库 Skill 是否存在；
- 每个 Skill 是否具有合法 frontmatter，且名称与目录一致；
- `AGENTS.md` 和每个 Skill 是否具有简体中文人工审阅镜像，并保持相同 Skill 身份；
- 每个决策记录是否使用受支持的生命周期、分类、文件名、状态和章节；
- 每份 AI 基础设施说明和 Decision Note 是否具有简体中文配对文件，并保持相同生命周期和分类元数据；
- 归档记录是否包含归档元数据并继续保持 implemented 状态；
- Skill 中是否残留未完成的脚手架标记。

`npm run verify` 会在类型检查、自动测试、生产构建和既有产品边界审计之前运行这项门禁。验证器自身具有聚焦测试，覆盖当前仓库结构、Skill 身份和归档规则。

结构检查不能判断文字内容是否真实。审阅者仍需把 Skill 或 Note 与所属代码、测试、公开文档和当前产品边界对照。

## 维护流程

### 新增或修改 Skill

1. 确认工作流会重复发生，并且需要本仓库特有的判断。
2. 使用小写、动作导向的目录名，并让 frontmatter `name` 与其一致。
3. 编写能够准确区分使用场景的 `description`。
4. 保持入口聚焦；只有在具有明确重复用途时才增加 `references/` 或 `scripts/`。
5. 更新本文档，运行 `npm run verify:agents` 和 `npm run verify`。

### 新增或修改决策记录

1. 搜索生效中的 Notes，确认当前归属以及是否发生替代。
2. 从封闭集合中选择生命周期和分类。
3. 记录问题、真实方案或决定、确实考虑过的替代方案、影响或风险以及验证方式。
4. 决策部分或全部被替代时，更新链接和之前的归属记录。
5. 按归档条件判断，不能按年龄或数量归档。
6. 运行 `npm run verify:agents`，并运行能够证明受影响行为的检查。

## 明确限制

这套基础设施不会给予 AI 额外权限。没有用户请求时，它不允许发布、推送、创建标签、删除用户数据或改变外部状态。它也不会把产品行为移入提示词：官方 DSH 边界、Electron 安全、版本行为和发布完整性继续由源代码、测试、脚本和 CI 负责执行。
