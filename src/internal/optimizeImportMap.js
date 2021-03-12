export const optimizeImportMap = ({ imports, scopes }) => {
  // remove useless duplicates (scoped key+value already defined on imports)
  const scopesOptimized = {}
  Object.keys(scopes).forEach((scope) => {
    const scopeMappings = scopes[scope]
    const scopeMappingsOptimized = {}
    Object.keys(scopeMappings).forEach((mappingKey) => {
      const topLevelMappingValue = imports[mappingKey]
      const mappingValue = scopeMappings[mappingKey]
      if (!topLevelMappingValue || topLevelMappingValue !== mappingValue) {
        scopeMappingsOptimized[mappingKey] = mappingValue
      }
    })
    if (Object.keys(scopeMappingsOptimized).length > 0) {
      scopesOptimized[scope] = scopeMappingsOptimized
    }
  })
  return { imports, scopes: scopesOptimized }
}
