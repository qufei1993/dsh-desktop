# 贡献指南

感谢你帮助改进 DSH Desktop。无论是缺陷报告、文档修正、测试还是代码贡献，都欢迎参与。

参与项目即表示你同意遵守[行为准则](CODE_OF_CONDUCT.md)。安全漏洞请按[安全策略](SECURITY.md)私下报告，不要提交公开 Issue。

## 开始之前

提交较大功能前，请先创建 Feature Request，说明使用场景、产品边界和替代方案，避免双方在方向不一致时投入大量时间。小型修复和文档改进可以直接提交 Pull Request。

项目坚持以下边界：

- 不 fork、修改、注入或重新编译官方 DeepSeek Harness。
- 不依赖 DSH 私有 API。
- 不接管 DSH 的模型、密钥、会话、Skills、MCP 或数据目录。
- 不把 DSH 服务暴露到回环地址之外。
- 安装版本必须来自官方 npm 包 `@deepseek-ai/dsh`，且固定到精确版本。

不符合这些边界的功能不会合并。

## 开发环境

需要 macOS 或 Windows、Node.js 22.19+ 或 24+、npm 10+ 和 Git。

```bash
git clone https://github.com/qufei1993/dsh-desktop.git
cd dsh-desktop
npm ci
npm run prepare:runtime
npm run dev
```

`prepare:runtime` 会下载较大的运行时和官方 DSH 包。它们只保存在 `build-resources/`，不应提交到 Git。

## 提交改动

1. 从最新的 `main` 创建短生命周期分支。
2. 保持改动聚焦，并为行为变化补充测试和文档。
3. 不要提交密钥、签名证书、用户数据、构建目录或安装包。
4. 使用清晰的提交信息，建议格式为 `类型: 简短说明`，例如 `fix: 修复版本切换后的进程回收`。
5. 创建 Pull Request 前完成本地验证。

推荐的提交类型包括 `feat`、`fix`、`docs`、`test`、`refactor`、`build` 和 `chore`。

## 验证要求

所有改动至少运行：

```bash
npm run verify
```

涉及内置运行时、DSH 启动或打包的改动还应运行：

```bash
npm run test:official
npm run test:packaged
```

`test:packaged` 需要先在当前平台生成安装包。无法执行某项平台测试时，请在 Pull Request 中明确说明原因和已完成的替代验证。

## Pull Request 要求

- 说明问题、方案和用户可见变化。
- 关联对应 Issue；没有 Issue 时说明背景。
- 列出实际运行过的测试。
- UI 变化提供截图或录屏。
- 依赖变化解释必要性，并提交同步更新的 `package-lock.json`。
- 不混入无关格式化或重构。
- 如有用户可见变化，在 `CHANGELOG.md` 的“未发布”部分记录。

维护者可能要求拆分过大的 Pull Request。合并方式由维护者根据提交历史选择，通常使用 squash merge。

## 发布

公开版本由维护者发布。版本号遵循语义化版本；Git 标签必须为 `v<package.json 中的版本>`。推送标签后，CI 会验证、跨平台打包、生成校验值与 SBOM，并创建 GitHub Release。

签名密钥和公证凭据只存放在 GitHub Actions Secrets 中，禁止写入仓库、日志或 Issue。
