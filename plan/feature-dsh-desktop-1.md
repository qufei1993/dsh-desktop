---
goal: DSH Desktop 跨平台壳应用首版
version: 1.0
date_created: 2026-08-15
last_updated: 2026-08-15
owner: dsh-desktop maintainers
status: 'Completed'
tags: [feature, electron, desktop, dsh]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

实现不修改官方 DeepSeek Harness 的 macOS 与 Windows 桌面壳，负责随应用提供 Node.js、安装和切换官方 DSH 版本、托管官方 Web 进程并在隔离窗口中展示官方页面。

## 1. Requirements & Constraints

- **REQ-001**: 支持 macOS arm64、macOS x64 和 Windows x64，使用同一套 Electron、React、TypeScript 源码。
- **REQ-002**: 安装、保留、切换 npm 包 `@deepseek-ai/dsh` 的精确官方版本，并由用户决定是否升级。
- **REQ-003**: 使用随应用打包的 Node.js 24 LTS 运行官方入口和 npm，不依赖用户系统 Node.js。
- **REQ-004**: 用 `<node> <dsh-bin> web --port 0` 启动一个官方 DSH 进程，解析其回环地址并在独立窗口展示。
- **REQ-005**: DSH 版本和 DSH Desktop 自身更新必须是相互独立的通道。
- **SEC-001**: 官方 DSH 窗口禁用 Node 集成和 preload，启用 context isolation 与 sandbox，只允许已验证的 `127.0.0.1` 启动源。
- **SEC-002**: IPC 必须采用显式白名单并校验输入，日志不得记录用户环境值、密钥或 DSH 数据。
- **CON-001**: 不修改、补丁、重新编译、注入或导入官方 DSH 私有实现。
- **CON-002**: 不读取、写入、迁移、备份或删除 DSH_HOME，不为版本创建独立 DSH_HOME；生产进程原样继承用户环境。
- **CON-003**: 不管理模型、密钥、会话、插件、Skills 或 MCP；这些功能全部留在官方 DSH 页面。
- **GUD-001**: 所有安装均先进入临时目录，校验精确版本和入口后再原子发布；失败不得破坏已有版本。
- **PAT-001**: 主进程负责文件、网络和子进程能力，渲染进程只通过类型化 preload API 调用白名单操作。

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: 建立可编译、可测试、可打包的跨平台桌面工程。

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | 创建 package.json、TypeScript、Vite、Vitest、Electron Builder 和 GitHub Actions 配置。 | ✅ | 2026-08-15 |
| TASK-002 | 创建主进程、preload、React 管理界面和共享契约，落实最小 IPC 白名单。 | ✅ | 2026-08-15 |
| TASK-003 | 创建独立 DSH BrowserWindow、导航限制、权限拒绝和外链处理。 | ✅ | 2026-08-15 |

### Implementation Phase 2

- GOAL-002: 实现不改变官方行为的版本管理与运行托管。

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-004 | 实现 npm registry 版本目录查询、精确版本安装、校验、保留和切换。 | ✅ | 2026-08-15 |
| TASK-005 | 实现 bundled Node/npm 路径解析与 Node 24 多平台资源准备脚本。 | ✅ | 2026-08-15 |
| TASK-006 | 实现官方 DSH 单进程生命周期、输出地址解析、超时、停止和状态事件。 | ✅ | 2026-08-15 |
| TASK-007 | 实现应用原子状态、安装进度、版本提示与用户选择界面。 | ✅ | 2026-08-15 |

### Implementation Phase 3

- GOAL-003: 建立自动化证据并完成交付文档。

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-008 | 添加解析、状态、安装校验、进程托管和安全边界单元及集成测试。 | ✅ | 2026-08-15 |
| TASK-009 | 添加真实官方 DSH 冒烟脚本，测试时仅以临时 DSH_HOME 保护用户数据。 | ✅ | 2026-08-15 |
| TASK-010 | 完成 macOS 本机构建验证和三目标 CI 构建配置，更新 README 与设计状态。 | ✅ | 2026-08-15 |
| TASK-011 | 执行源码边界扫描、测试、类型检查、构建及产物审计并记录结果。 | ✅ | 2026-08-15 |

## 3. Alternatives

- **ALT-001**: Tauri 安装体更小，但仍需额外系统依赖和跨语言桥接，首版无法比 Electron 更直接地复用 Node/npm 工具链。
- **ALT-002**: 在 Electron 内嵌或复制官方前端会造成实现分叉，违反只做壳的边界。
- **ALT-003**: 调用系统 Node.js 可减少包体，但会把版本和 PATH 配置负担重新交给普通用户。

## 4. Dependencies

- **DEP-001**: Electron、React、Vite 与 TypeScript 提供跨平台桌面和管理界面基础。
- **DEP-002**: electron-builder 生成 macOS 与 Windows 安装包。
- **DEP-003**: Node.js 官方发行包作为运行 sidecar，npm registry 作为官方 DSH 版本来源。
- **DEP-004**: Vitest 提供可重复执行的单元与集成测试。

## 5. Files

- **FILE-001**: `/package.json` 及根目录构建、类型检查和测试配置。
- **FILE-002**: `/src/main/` Electron 主进程、版本安装、进程托管、状态和安全策略。
- **FILE-003**: `/src/preload/` 白名单桥接与 `/src/renderer/` React 管理界面。
- **FILE-004**: `/src/shared/` IPC 契约、模型和校验规则。
- **FILE-005**: `/scripts/` Node sidecar 准备、真实 DSH 冒烟和边界审计脚本。
- **FILE-006**: `/tests/` 自动测试与夹具。
- **FILE-007**: `/.github/workflows/` 三平台构建与测试流水线。
- **FILE-008**: `/README.md`、设计文档和许可证说明。

## 6. Testing

- **TEST-001**: 验证只接受回环 HTTP 地址并正确解析官方启动输出。
- **TEST-002**: 验证精确版本、路径和 IPC 输入拒绝注入及目录穿越。
- **TEST-003**: 用假 CLI 验证启动、就绪、重复启动、异常退出和优雅停止。
- **TEST-004**: 用临时目录验证安装事务不会覆盖已安装版本或 DSH 数据目录。
- **TEST-005**: 运行官方 `@deepseek-ai/dsh` Web 服务并确认 HTTP 200 与官方启动标记。
- **TEST-006**: 执行类型检查、生产构建、Electron 打包配置检查和边界关键词扫描。

## 7. Risks & Assumptions

- **RISK-001**: 官方 CLI 输出或 npm 包布局变化会导致启动或安装校验失败；应用必须明确报错且保留旧版本。
- **RISK-002**: macOS 签名、公证和 Windows 代码签名依赖仓库密钥；无密钥 CI 只能生成未签名测试产物。
- **RISK-003**: 当前 macOS 主机无法直接运行 Windows 二进制；Windows 运行证据由 Windows CI runner 生成。
- **ASSUMPTION-001**: 官方继续通过 npm 发布 `@deepseek-ai/dsh`，并提供 `dsh web --port 0` 公共 CLI 契约。
- **ASSUMPTION-002**: Node.js 24 LTS 满足当前及首版支持范围内官方 DSH 的 engines 要求。

## 8. Related Specifications / Further Reading

[DSH Desktop 设计规格](../docs/superpowers/specs/2026-08-15-dsh-desktop-design.md)

[Node.js 官方下载](https://nodejs.org/dist/)

[Electron 安全指南](https://www.electronjs.org/docs/latest/tutorial/security)
