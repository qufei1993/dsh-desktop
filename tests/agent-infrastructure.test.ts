import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { validateAgentInfrastructure, validateDecisionFile, validateDecisionTranslation, validateSkillFile } from '../scripts/verify-agent-infrastructure'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

describe('AI engineering infrastructure', () => {
  it('validates the checked-in skills and decision-note tree', async () => {
    expect(await validateAgentInfrastructure(root)).toEqual([])
  })

  it('rejects a skill whose declared name differs from its directory', () => {
    const content = `---\nname: wrong-name\ndescription: Review changes.\n---\n\n# Review\n`
    expect(validateSkillFile('expected-name', content)).toContain('frontmatter name must be expected-name')
  })

  it('requires archive metadata and keeps archived status implemented', () => {
    const content = `# Decision: Historical choice\n\nStatus: archived\nCategory: architecture\n\n## Problem\n\nProblem.\n\n## Decision\n\nDecision.\n\n## Alternatives considered\n\nAlternative.\n\n## Consequences\n\nConsequence.\n\n## Verification\n\nVerification.\n`
    expect(validateDecisionFile('archived', 'architecture', '2026-08-22-historical-choice.md', content)).toEqual([
      'Status must be implemented',
      'missing Archived metadata',
      'missing Superseded by metadata',
      'missing Archive reason metadata'
    ])
  })

  it('requires the Chinese decision counterpart to preserve status and category', () => {
    const content = `# Decision: 中文决定\n\nStatus: implemented\nCategory: product\n\n## 问题\n\n问题。\n\n## 决定\n\n决定。\n\n## 考虑过的替代方案\n\n替代方案。\n\n## 影响\n\n影响。\n\n## 验证\n\n验证。\n`
    expect(validateDecisionTranslation('implemented', 'security', content)).toEqual(['Category must be security'])
  })
})
