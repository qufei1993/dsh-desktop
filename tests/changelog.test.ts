import { describe, expect, it } from 'vitest'
import { extractChangelogSection } from '../scripts/extract-changelog.mjs'

describe('release changelog extraction', () => {
  const changelog = `# 变更日志

## 未发布

- 下一版

## [0.2.0] - 2026-08-15

### 新增

- 应用更新。

## 0.1.0 - 2026-08-01

- 首个版本。
`

  it('按 Tag 提取对应版本且不会混入相邻版本', () => {
    expect(extractChangelogSection(changelog, 'v0.2.0')).toBe('### 新增\n\n- 应用更新。')
  })

  it('支持不带方括号的版本标题', () => {
    expect(extractChangelogSection(changelog, '0.1.0')).toBe('- 首个版本。')
  })

  it('缺少版本时返回空值以阻止发布', () => {
    expect(extractChangelogSection(changelog, 'v9.9.9')).toBeNull()
  })
})
