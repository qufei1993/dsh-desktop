import path from 'node:path'

function importSpecifiers(content: string): string[] {
  return [
    ...Array.from(content.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g), (match) => match[1]),
    ...Array.from(content.matchAll(/^\s*import\s+['"]([^'"]+)['"]/gm), (match) => match[1]),
    ...Array.from(content.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g), (match) => match[1])
  ]
}

function resolvedSourceImport(relativeFile: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) return null
  return path.posix.normalize(path.posix.join(path.posix.dirname(relativeFile), specifier))
}

function isNodeOrElectron(specifier: string): boolean {
  return specifier === 'electron' || specifier.startsWith('node:')
}

/** Return violations of the source-layer dependency rules in AGENTS.md. */
export function sourceBoundaryViolations(relativeFile: string, content: string): string[] {
  const file = relativeFile.replaceAll('\\', '/')
  const violations: string[] = []
  const specifiers = importSpecifiers(content)

  if (content.includes('DSH_HOME')) violations.push('production source must not override DSH_HOME')
  if (specifiers.some((specifier) => specifier === '@deepseek-ai/dsh' || specifier.startsWith('@deepseek-ai/dsh/'))) {
    violations.push('must not import official DSH source modules')
  }
  if (/nodeIntegration:\s*true/.test(content)) violations.push('Node integration must stay disabled')
  if (/shell:\s*true/.test(content)) violations.push('child processes must not use a shell')

  for (const specifier of specifiers) {
    const resolved = resolvedSourceImport(file, specifier)
    if (file.startsWith('src/renderer/')) {
      if (isNodeOrElectron(specifier)) violations.push(`renderer must not import ${specifier}`)
      if (resolved?.startsWith('src/main/') || resolved?.startsWith('src/preload/')) {
        violations.push(`renderer must not import ${resolved}`)
      }
    }
    if (file.startsWith('src/shared/')) {
      if (isNodeOrElectron(specifier)) violations.push(`shared must not import ${specifier}`)
      if (resolved?.startsWith('src/main/') || resolved?.startsWith('src/preload/') || resolved?.startsWith('src/renderer/')) {
        violations.push(`shared must not import ${resolved}`)
      }
    }
    if (file.startsWith('src/preload/')) {
      const allowed = specifier === 'electron' || resolved?.startsWith('src/shared/')
      if (!allowed) violations.push(`preload may import only electron and src/shared, got ${specifier}`)
    }
  }

  return [...new Set(violations)]
}
