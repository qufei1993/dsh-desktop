# DSH Desktop

一个面向 macOS 和 Windows 的非官方 DeepSeek Harness 桌面壳。

DSH Desktop 解决的是安装和启动门槛：应用自带 Node.js 24 LTS，可安装、保留、切换官方 `@deepseek-ai/dsh` 版本，并把官方 `dsh web` 页面放进独立桌面窗口。它不修改 DeepSeek Harness，不复制官方界面，也不接管模型、密钥、会话、Skills、MCP 或用户数据。

正常启动会直接进入官方 DeepSeek Harness 页面。版本管理位于系统菜单的“版本管理…”中；只有没有可用版本或官方进程启动失败时，才会自动显示管理页面。

> DSH Desktop 是社区项目，与 DeepSeek 官方无隶属或背书关系。DeepSeek Harness 仍按其自身许可证和行为运行。

## 首版能力

- macOS Apple Silicon、macOS Intel、Windows x64
- 随安装包提供 Node.js 24 LTS，用户无需安装 Node.js
- 随应用提供一个经过校验的官方 DSH 版本
- 从 npm 官方版本目录读取全部历史版本和发布日期，可搜索、筛选并由用户决定是否安装
- 多个官方版本并存，可随时切回旧版本
- 同一时间只运行一个官方 `dsh web --port 0` 进程
- DSH 页面使用独立沙箱窗口，管理窗口无法访问页面内容
- 不设置 `DSH_HOME`，沿用官方默认数据行为

## 明确不做

- 不 fork、patch、重新编译或注入官方 DSH
- 不导入 DSH 私有 API
- 不读取、迁移、备份或删除 DSH 数据目录
- 不管理 API Key、模型、会话、插件、Skills 或 MCP
- 不自动升级或强制替换用户选择的 DSH 版本

完整边界见[设计规格](docs/superpowers/specs/2026-08-15-dsh-desktop-design.md)。

## 本地开发

需要 Node.js 22.19+ 或 24+，仅开发者需要。

```bash
npm install
npm run prepare:runtime
npm run dev
```

`prepare:runtime` 会从 Node.js 官网下载当前锁定的 Node 24 LTS 发行包，依据官方 `SHASUMS256.txt` 校验，然后用该 Node/npm 精确安装随包 DSH。生成内容位于被 Git 忽略的 `build-resources/`。

## 验证

```bash
npm run verify
npm run test:official
```

第一条命令执行类型检查、自动测试、生产构建和产品边界审计。第二条使用随包 Node 启动真实官方 DSH，等待随机回环端口，校验 HTTP 200 和官方页面启动标记；测试会临时设置隔离的 `DSH_HOME`，结束后删除，避免触碰真实用户数据。

## 打包

在对应操作系统执行：

```bash
npm run package:mac:arm64
npm run package:mac:x64
npm run package:win:x64
```

未配置签名密钥时可生成测试安装包。正式发布需要在 GitHub Actions 中配置 Apple Developer ID、公证凭据和 Windows 代码签名凭据。

打包完成后会同时生成 `SHA256SUMS`、DSH Desktop 与官方 DSH 两份 CycloneDX SBOM，以及第三方许可证清单。macOS 发布物包含 DMG 和 ZIP，Windows 发布物为 NSIS EXE。

## 目录

- `src/main/`：Electron 主进程、官方版本安装和进程托管
- `src/preload/`：管理窗口的最小 IPC 白名单
- `src/renderer/`：DSH Desktop 管理界面
- `src/shared/`：类型和输入校验契约
- `scripts/`：官方 Node/DSH 资源准备、冒烟和边界审计
- `tests/`：单元与进程集成测试
- `plan/`、`docs/`：实施计划与架构设计

## License

[MIT](LICENSE)
