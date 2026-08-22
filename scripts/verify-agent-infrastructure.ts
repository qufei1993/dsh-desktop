import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const lifecycles = ['proposed', 'implemented', 'rejected', 'archived'] as const
const categories = ['architecture', 'product', 'process', 'security', 'testing'] as const
const requiredSkills = [
  'dsh-desktop-agent-notes',
  'dsh-desktop-code-review',
  'dsh-desktop-doc-sync',
  'dsh-desktop-pre-push',
  'dsh-desktop-release'
] as const

type Lifecycle = typeof lifecycles[number]
type Category = typeof categories[number]

function field(content: string, name: string): string | null {
  return content.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'))?.[1]?.trim() ?? null
}

function hasHeading(content: string, heading: string): boolean {
  return content.includes(`\n## ${heading}\n`)
}

export function validateSkillFile(directoryName: string, content: string): string[] {
  const errors: string[] = []
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---\n/)
  if (!frontmatter) return ['missing YAML frontmatter']
  const name = field(frontmatter[1], 'name')
  const description = field(frontmatter[1], 'description')
  if (name !== directoryName) errors.push(`frontmatter name must be ${directoryName}`)
  if (!description) errors.push('frontmatter description must be non-empty')
  if (!/^#[^#]/m.test(content.slice(frontmatter[0].length))) errors.push('skill body must have a top-level heading')
  if (/\b(TODO|TBD|PLACEHOLDER)\b/.test(content)) errors.push('unfinished scaffold marker found')
  return errors
}

export function validateDecisionFile(lifecycle: Lifecycle, category: Category, filename: string, content: string): string[] {
  const errors: string[] = []
  if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(filename)) {
    errors.push('filename must be yyyy-mm-dd-lowercase-topic.md')
  }
  if (!content.startsWith('# Decision: ')) errors.push('first line must start with # Decision:')
  const expectedStatus = lifecycle === 'archived' ? 'implemented' : lifecycle
  if (field(content, 'Status') !== expectedStatus) errors.push(`Status must be ${expectedStatus}`)
  if (field(content, 'Category') !== category) errors.push(`Category must be ${category}`)
  for (const heading of ['Problem', 'Alternatives considered']) {
    if (!hasHeading(content, heading)) errors.push(`missing ## ${heading}`)
  }
  if (lifecycle === 'proposed') {
    for (const heading of ['Proposal', 'Acceptance criteria', 'Risks']) {
      if (!hasHeading(content, heading)) errors.push(`missing ## ${heading}`)
    }
  } else if (lifecycle === 'implemented' || lifecycle === 'archived') {
    for (const heading of ['Decision', 'Consequences', 'Verification']) {
      if (!hasHeading(content, heading)) errors.push(`missing ## ${heading}`)
    }
  } else {
    for (const heading of ['Proposal', 'Consequences']) {
      if (!hasHeading(content, heading)) errors.push(`missing ## ${heading}`)
    }
  }
  if (lifecycle === 'archived') {
    for (const metadata of ['Archived', 'Superseded by', 'Archive reason']) {
      if (!field(content, metadata)) errors.push(`missing ${metadata} metadata`)
    }
  }
  return errors
}

export function validateDecisionTranslation(lifecycle: Lifecycle, category: Category, content: string): string[] {
  const errors: string[] = []
  if (!content.startsWith('# Decision: ')) errors.push('first line must start with # Decision:')
  const expectedStatus = lifecycle === 'archived' ? 'implemented' : lifecycle
  if (field(content, 'Status') !== expectedStatus) errors.push(`Status must be ${expectedStatus}`)
  if (field(content, 'Category') !== category) errors.push(`Category must be ${category}`)
  for (const heading of ['问题', '考虑过的替代方案']) {
    if (!hasHeading(content, heading)) errors.push(`missing ## ${heading}`)
  }
  if (lifecycle === 'proposed') {
    for (const heading of ['方案', '验收标准', '风险']) {
      if (!hasHeading(content, heading)) errors.push(`missing ## ${heading}`)
    }
  } else if (lifecycle === 'implemented' || lifecycle === 'archived') {
    for (const heading of ['决定', '影响', '验证']) {
      if (!hasHeading(content, heading)) errors.push(`missing ## ${heading}`)
    }
  } else {
    for (const heading of ['方案', '影响']) {
      if (!hasHeading(content, heading)) errors.push(`missing ## ${heading}`)
    }
  }
  if (lifecycle === 'archived') {
    for (const metadata of ['Archived', 'Superseded by', 'Archive reason']) {
      if (!field(content, metadata)) errors.push(`missing ${metadata} metadata`)
    }
  }
  return errors
}

async function markdownFiles(directory: string): Promise<string[]> {
  const result: string[] = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) result.push(...await markdownFiles(target))
    else if (entry.name.endsWith('.md')) result.push(target)
  }
  return result
}

export async function validateAgentInfrastructure(root: string): Promise<string[]> {
  const errors: string[] = []
  const agentsRoot = path.join(root, '.agents')
  const skillsRoot = path.join(agentsRoot, 'skills')
  const notesRoot = path.join(agentsRoot, 'notes')

  for (const document of ['AGENTS.md', 'AGENTS.zh-CN.md']) {
    try {
      const content = await readFile(path.join(root, document), 'utf8')
      if (!content.includes(document === 'AGENTS.md' ? '(AGENTS.zh-CN.md)' : '(AGENTS.md)')) {
        errors.push(`${document}: language counterpart link is required`)
      }
    } catch {
      errors.push(`${document} is required`)
    }
  }

  const requiredDocuments = ['README.md', path.join('notes', 'README.md'), ...lifecycles.map((item) => path.join('notes', item, 'README.md'))]
  for (const relative of requiredDocuments) {
    for (const document of [relative, relative.replace(/\.md$/, '.zh-CN.md')]) {
      try {
        await readFile(path.join(agentsRoot, document), 'utf8')
      } catch {
        errors.push(`${path.join('.agents', document)} is required`)
      }
    }
  }

  for (const skill of requiredSkills) {
    const relative = path.join('.agents', 'skills', skill, 'SKILL.md')
    try {
      const content = await readFile(path.join(skillsRoot, skill, 'SKILL.md'), 'utf8')
      errors.push(...validateSkillFile(skill, content).map((error) => `${relative}: ${error}`))
    } catch {
      errors.push(`${relative} is required`)
    }
    const translatedRelative = path.join('.agents', 'skills', skill, 'SKILL.zh-CN.md')
    try {
      const content = await readFile(path.join(skillsRoot, skill, 'SKILL.zh-CN.md'), 'utf8')
      errors.push(...validateSkillFile(skill, content).map((error) => `${translatedRelative}: ${error}`))
      if (!content.includes('(SKILL.md)')) errors.push(`${translatedRelative}: English counterpart link is required`)
    } catch {
      errors.push(`${translatedRelative} is required`)
    }
  }

  for (const file of await markdownFiles(notesRoot)) {
    const relative = path.relative(notesRoot, file)
    const parts = relative.split(path.sep)
    if (parts.at(-1)?.startsWith('README')) continue
    if (file.endsWith('.zh-CN.md')) {
      const englishFile = file.replace(/\.zh-CN\.md$/, '.md')
      try {
        await readFile(englishFile, 'utf8')
      } catch {
        errors.push(`${path.join('.agents', 'notes', relative)}: English counterpart is required`)
      }
      continue
    }
    if (parts.length !== 3 || !lifecycles.includes(parts[0] as Lifecycle) || !categories.includes(parts[1] as Category)) {
      errors.push(`${path.join('.agents', 'notes', relative)}: decision must be under <lifecycle>/<category>/`)
      continue
    }
    const [lifecycle, category, filename] = parts as [Lifecycle, Category, string]
    const content = await readFile(file, 'utf8')
    errors.push(...validateDecisionFile(lifecycle, category, filename, content).map((error) => `${path.join('.agents', 'notes', relative)}: ${error}`))
    const translation = file.replace(/\.md$/, '.zh-CN.md')
    try {
      const translatedContent = await readFile(translation, 'utf8')
      const translatedRelative = path.relative(notesRoot, translation)
      errors.push(...validateDecisionTranslation(lifecycle, category, translatedContent).map((error) => `${path.join('.agents', 'notes', translatedRelative)}: ${error}`))
    } catch {
      errors.push(`${path.join('.agents', 'notes', relative.replace(/\.md$/, '.zh-CN.md'))}: Simplified Chinese counterpart is required`)
    }
  }

  return errors
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null
if (invokedPath === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const errors = await validateAgentInfrastructure(root)
  if (errors.length) throw new Error(`AI infrastructure validation failed:\n${errors.join('\n')}`)
  console.log('AI infrastructure validation passed')
}
