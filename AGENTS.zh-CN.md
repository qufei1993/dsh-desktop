# DSH Desktop 项目规则

[English（AI 权威指令）](AGENTS.md) | 简体中文（人工审阅）

> 本文件用于中文人工审阅。AI 自动加载的权威指令仍是 `AGENTS.md`；修改任何一方时必须同步另一方。

## 产品边界

- DSH Desktop 是官方 `@deepseek-ai/dsh` 包在 macOS 和 Windows 上的社区 Electron 桌面壳。
- 保持官方 DSH 不变：不得 fork、patch、重新构建、注入或导入其私有模块，也不得接管其配置、凭据、会话、插件、Skills、MCP、权限或用户数据。
- 桌面应用只拥有内置运行时、精确的官方 DSH 安装、应用状态、进程托管、Desktop 自有窗口和应用更新通道。
- 官方 DSH 包更新与 DSH Desktop 应用更新必须保持独立并由用户控制。没有用户明确操作时，不得安装、选择、切换或替换 DSH 版本。

## 架构不变量

- 保持运行链路：Electron 主进程 → 内置标准 Node.js 子进程 → 官方 DSH CLI → `http://127.0.0.1:<随机端口>` → 隔离的 DSH `BrowserWindow`。
- DSH 只能使用内置 Node.js 和解析出的官方 CLI 入口运行。不得在 Electron 的 Node.js 中运行 DSH，也不得依赖系统 Node.js、npm、pnpm 或 shell `PATH` 定位运行时。
- Electron 主进程是应用唯一的特权层。文件系统、网络、进程、更新器、菜单、窗口和外部 URL 操作都在主进程执行。
- 官方 DSH Window 只显示官方 Web UI。它没有 preload，不接受 Desktop 控件或注入代码，也不暴露 Node.js、Electron 或 Desktop IPC API。
- Desktop 自有 renderer 只能通过类型化 preload bridge 访问特权行为。主进程在执行操作前必须再次验证不可信 IPC 输入。
- 官方 DSH 状态和 Desktop 状态必须分离。生产代码可以继承已有 `DSH_HOME`，但绝不设置、重定向、读取、迁移、备份或删除它。

## 仓库目录

```text
src/main/       Electron 特权层装配、窗口、进程、版本、网络、状态和更新
src/preload/    Desktop renderer 到已验证 IPC 的最小类型化桥接
src/renderer/   无特权的 Desktop 自有管理 UI 和样式
src/shared/     不依赖特权模块的 IPC channel、schema 和跨进程类型
scripts/        构建、打包、发布、冒烟和确定性仓库门禁
tests/          行为测试；可复用假可执行程序和数据位于 tests/fixtures/
docs/           面向维护者和贡献者的文档
.agents/skills/ 可复用的仓库专用 AI 工作流
.agents/notes/  持久产品与工程决策
build/          经过审阅、供打包使用的静态源资源
out/            生成的生产构建；不得直接编辑或提交
release/        生成的安装包和发布元数据；不得作为源码编辑或提交
build-resources/ 下载或生成的运行时与官方 DSH 资源；不得作为源码编辑或提交
```

## 代码放置与依赖规则

- `src/main/index.ts` 只作为应用装配、窗口、菜单和 IPC wiring 入口。可独立测试的进程、安装、更新、网络、状态和策略行为应放入聚焦的 `src/main/` 模块。
- `src/preload/` 只能导入 Electron 和 `src/shared/`。它只暴露狭窄的 `DesktopApi` bridge，不包含文件、网络、安装、更新或进程管理业务逻辑。
- `src/renderer/` 可以导入 renderer 库和 `src/shared/`，但不得导入 Electron、Node.js 内置模块、`src/main/` 或 `src/preload/`。
- `src/shared/` 只保存与运行环境无关的类型、schema 和常量，不得导入 Electron、Node.js 内置模块、main、preload 或 renderer 模块。
- IPC 名称集中放在 `src/shared/ipc-channels.ts`，跨进程 contract 和验证 schema 放在 `src/shared/contracts.ts`，bridge 暴露放在 `src/preload/index.ts`。
- 生产源码只能通过公开 CLI 和 loopback HTTP endpoint 与官方 DSH 交互，禁止添加 `@deepseek-ai/dsh` 源码导入。
- 测试统一放在根目录 `tests/`，不能与生产文件混放；共享测试可执行程序和数据放在 `tests/fixtures/`。
- 不得直接编辑 `out/`、`release/`、`build-resources/` 或 `node_modules/` 中的生成产物和依赖；应修改对应源码或生成器。

## 运行时与版本生命周期

- 一个 `DshSupervisor` 最多拥有一个 DSH 子进程。启动或切换版本前必须停止其拥有的进程；应用退出时必须终止其拥有的进程树。
- 使用绝对可执行路径、`shell: false` 和平台感知的环境变量处理启动子进程。启动失败、超时、取消、正常停止和意外退出都必须完成清理。
- 只有解析出明确的 `http://127.0.0.1:<端口>` 并通过健康检查后，才能接受 DSH URL；只有就绪成功后才能创建 DSH Window。
- 只安装官方包中合法、精确的 SemVer。先安装到应用自有临时目录，验证包和 CLI 后，通过同一文件系统原子重命名发布。
- 安装失败、取消或中断不能破坏已安装版本。卸载只能删除 DSH Desktop 拥有的完整版本目录，绝不触碰官方 DSH 用户数据。
- 安装版本不会自动选择或启动，除非用户明确请求组合操作。保留之前的完整版本供用户主动回退。

## 安全与平台规则

- 支持 macOS Apple Silicon、macOS Intel 和 Windows x64。平台专用路径、可执行文件名、进程行为、打包资源和更新器行为必须有经过测试的回退或明确失败。
- 所有 `BrowserWindow` 保持 `nodeIntegration: false`、`contextIsolation: true` 和 `sandbox: true`。官方 DSH Window 没有 preload；Desktop 自有窗口只能使用经过验证的 bridge。
- 适用时拒绝权限请求，阻止不可信导航和新窗口，只允许通过系统浏览器打开经过验证的 HTTPS 外部 URL。
- 禁止启用基于 shell 的子进程、将 DSH 服务暴露到 loopback 之外，或者把特权能力放入 renderer。
- 所有应用可见文本必须同时提供简体中文和英文，并保持插值参数和行为等价。

## 改动与验证规则

- 采用能够完整解决请求的最小改动，保留无关工作；意图明确时不要因日常确认停止工作。
- 行为变化必须补充聚焦回归测试。安全和所有权规则要测试拒绝路径；mock 无法证明最终行为时，要覆盖真实安装包或官方 DSH 入口。
- 完成代码改动前运行 `npm run verify`。影响内置运行时、DSH 启动、包管理器、CLI 解析或 DSH 边界时运行 `npm run test:official`；影响打包、安装包资源、Electron 启动或安装包 UI 时，构建当前平台安装包并运行 `npm run test:packaged`。
- 只报告实际执行过的检查。无法在本地测试必需平台时，说明缺失的平台证据并依赖 CI matrix，不能暗示本地已经覆盖。

## AI 工程基础设施

- 仓库专用工作流位于 `.agents/skills/`。进行代码审阅、推送前验证、发布、双语文档或 Decision Note 维护前，先读取匹配的 `SKILL.md`。
- 持久设计理由位于 `.agents/notes/`。修改产品所有权、运行时隔离、Electron 安全、版本管理、更新行为、测试策略或发布流程前，先查看生效中的 Notes。
- 当非平凡改动建立或修改持久的产品、架构、安全、流程或测试决定时，新增或更新 Decision Note。不要把 Notes 用作任务计划、Changelog 或用户文档替代品。
- 生命周期转换遵循 `.agents/notes/README.md`。归档 Notes 是冻结历史证据，不是当前依据。
- AI 基础设施说明、Decision Notes、`AGENTS.md` 和每个 `SKILL.md` 都必须有英文与简体中文版本。标准英文文件名是 AI 权威指令；`.zh-CN.md` 文件是等义的人工审阅镜像。

## 文档

- 英文 `*.md` 是默认文档，简体中文版本使用 `*.zh-CN.md` 后缀。
- 修改配对文件任一方时，必须在同一改动中更新另一语言，并保持含义、链接、命令、版本、警告和发布事实等价。
- 新增公开文档必须同时提供两种语言。内部设计记录通常无需翻译，除非属于双语 `.agents` 基础设施或自行声明为配对文档。
- GitHub Release Notes 从 `CHANGELOG.md` 对应版本章节提取；保持 `CHANGELOG.zh-CN.md` 同步。

## 发布完整性

- 通过 `npm run version:set -- x.y.z` 保持 `package.json` 与 `package-lock.json` 版本同步。
- 发布标签必须精确为 `vx.y.z`，推送标签前必须存在匹配的 Changelog 章节。
- 发布有意不使用付费或受信任的平台证书。macOS 只使用 ad-hoc 签名，Windows 安装包不签名。不要增加签名密钥要求，也不要暗示 Apple 公证或受信任发布者状态。
- 保持非受信任安装警告准确。macOS 应用更新采用检查后手动下载；Windows 可以使用应用内更新器。
