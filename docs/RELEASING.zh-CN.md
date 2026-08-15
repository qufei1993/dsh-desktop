[English](RELEASING.md) | 简体中文

# 发布指南

本指南面向 DSH Desktop 的发布维护者。普通贡献者不需要签名凭据。

## 发布前条件

- `main` 上的构建、CodeQL 和依赖审查均通过。
- `package.json` 与 `package-lock.json` 中的版本一致。
- `CHANGELOG.md` 已把本次内容从“未发布”整理到对应版本。
- macOS 和 Windows 的签名证书已配置到 GitHub Actions Secrets。
- 已在至少一台真实机器上验证候选安装包。

当前发布工作流使用以下 Secrets：

| Secret | 用途 |
| --- | --- |
| `MAC_CSC_LINK` | macOS Developer ID 证书内容或安全下载地址 |
| `MAC_CSC_KEY_PASSWORD` | macOS 证书密码 |
| `APPLE_API_KEY_BASE64` | App Store Connect API `.p8` 私钥的 Base64 内容 |
| `APPLE_API_KEY_ID` | App Store Connect API Key ID |
| `APPLE_API_ISSUER` | App Store Connect API Issuer ID |
| `WIN_CSC_LINK` | Windows 代码签名证书内容或安全下载地址 |
| `WIN_CSC_KEY_PASSWORD` | Windows 证书密码 |

不要把证书、密码或临时解密内容写入仓库、Issue、Pull Request 或构建日志。macOS Tag 构建会要求签名与 Apple 公证凭据全部存在，并由 electron-builder 完成签名、公证和票据装订；缺少任一项时不会创建正式 Release。

## 发布步骤

1. 运行 `npm run version:set -- x.y.z`，同步 `package.json` 与 lockfile 的版本。
2. 更新 `CHANGELOG.md`，把“未发布”内容整理到 `## [x.y.z] - YYYY-MM-DD`。
3. 运行 `npm run verify` 和当前平台的完整打包测试。
4. 合并发布改动并确认 `main` 的必需检查通过。
5. 在 `main` 当前提交创建并推送 `vx.y.z` 标签。
6. 等待 `build` 工作流完成跨平台构建；流水线会从 `CHANGELOG.md` 提取当前版本内容、合并三平台校验值并创建 GitHub Release。
7. 下载 Release 资产，核对 `SHA256SUMS`、SBOM、更新清单和签名。
8. 在三类支持平台上完成安装、首次启动、版本管理和更新检查冒烟测试。

标签必须与 `package.json` 完全一致，例如应用版本 `0.2.0` 对应标签 `v0.2.0`。不一致时 Release 任务会失败。

可以在推送标签前本地验证 Release 文案：

```bash
npm run version:check
npm run release:notes -- v0.2.0 CHANGELOG.md
```

如果 Changelog 中没有对应版本章节，发布会失败，不会退回到无关的提交记录或空白说明。

## 发布资产

正式 Release 应至少包含：

- macOS arm64 的 DMG、ZIP、blockmap 和更新清单；
- macOS x64 的 DMG、ZIP、blockmap 和更新清单；
- Windows x64 的 NSIS EXE、blockmap 和更新清单；
- `SHA256SUMS`；
- DSH Desktop 与官方 DSH 的 CycloneDX SBOM；
- `THIRD-PARTY-LICENSES.txt`。

不要手工替换已经发布的同名安装包。发现问题时撤下有问题的 Release，修复后发布新的补丁版本，确保自动更新元数据与二进制始终对应。

## 回滚与安全发布

如果版本存在严重回归，先在 Release 页面明确标记并停止推荐，再发布修复版本。不要移动已有版本标签。

涉及未公开漏洞时，在 GitHub Security Advisory 的私有协作区准备修复和公告，发布时间与报告者协调。公开公告中避免披露不必要的用户数据或仍可利用的操作细节。
