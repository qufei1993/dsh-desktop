export function prependRuntimePath(environment: NodeJS.ProcessEnv, entries: string[], platform = process.platform): NodeJS.ProcessEnv {
  const result = { ...environment }
  const pathKeys = Object.keys(result).filter((key) => key.toLowerCase() === 'path')
  const pathKey = pathKeys[0] ?? 'PATH'
  const separator = platform === 'win32' ? ';' : ':'
  const normalize = (value: string): string => platform === 'win32' ? value.toLowerCase() : value
  const seen = new Set<string>()
  const values = [...entries, ...(result[pathKey]?.split(separator) ?? [])].filter((value) => {
    if (!value) return false
    const normalized = normalize(value)
    if (seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })
  for (const duplicate of pathKeys.slice(1)) delete result[duplicate]
  result[pathKey] = values.join(separator)
  return result
}
