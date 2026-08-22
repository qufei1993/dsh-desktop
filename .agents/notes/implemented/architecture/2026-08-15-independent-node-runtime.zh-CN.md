# Decision: 使用独立 Node.js 运行官方 DSH

Status: implemented
Category: architecture

[English](2026-08-15-independent-node-runtime.md) | 简体中文

## 问题

DSH Desktop 必须在无需用户安装或配置 Node.js 的前提下，让官方 `@deepseek-ai/dsh` 在支持的设备上稳定运行。Electron 内置 Node.js 有独立的 ABI 和升级周期，而系统 Node.js 不受项目控制，可能缺失或版本不兼容。

## 决定

DSH Desktop 为每个支持的操作系统和 CPU 目标打包锁定版本的官方 Node.js 24 LTS 运行时。Electron 主进程使用内置 Node.js 的绝对路径和解析出的官方包 CLI 入口启动 DSH 子进程。项目不在 Electron 的 Node.js 运行时中执行 DSH，也不依赖系统 Node.js。

每次启动时，项目都会根据当前选中的 DSH 版本重新构建子进程环境。其 `PATH` 先使用 Desktop 的内置命令目录和 Node.js 目录，再保留继承的条目。Desktop 自有的 `dsh` 启动器会使用内置 Node.js 执行当前选中包中已经验证过的 CLI 入口；它明确不使用包管理器生成的 `.bin` shim，因为原子目录重命名可能让这些 shim 留下绝对 staging 路径。因此，官方插件流程按名称调用 `dsh`、`pnpm` 或 `node` 时，会使用当前选中的官方 CLI 和 Desktop 内置工具，而不是缺失、已重定位或无关的全局安装。Desktop 不创建全局 shim，也不修改用户持久化的 `PATH`。

## 考虑过的替代方案

**Electron 内置 Node.js。** 这会把官方 DSH 和原生依赖绑定到 Electron 的 Node.js、V8、ABI 和升级周期，与官方执行环境不同。

**用户的系统 Node.js。** 这能减小安装包，但首次启动会依赖外部安装、版本、PATH 和包管理器配置。

**Tauri 加内置 Node.js。** DSH 仍然需要 Node.js，同时项目会增加 Rust 和平台 WebView 差异，却没有消除核心运行时需求。

## 影响

安装包更大，并且需要按目标平台准备运行时。版本切换后，监督器还必须根据新选中版本重新确定命令解析路径。作为交换，DSH 启动和官方子流程可复现、不依赖 shell 配置，并且接近官方 Node.js 执行模型。运行时升级和 Electron 升级继续作为两个独立的兼容性决定。

## 验证

`npm run prepare:runtime` 下载并验证锁定的运行时，并创建目标平台的 `dsh` 与 `pnpm` 启动器。监督器回归测试会验证子进程内部能够解析 `dsh`，并把它委托给当前选中的精确入口。`npm run test:official` 先解析当前选中的 `dsh` CLI 和内置 `pnpm`，再使用锁定运行时启动内置官方 DSH。安装包 E2E 会通过最终应用资源中的启动器再次验证 CLI 解析。
