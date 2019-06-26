export const sortImportMap = (importMap) => {
  const orderedImportMap = {
    imports: sortImportMapImports(importMap.imports),
    scopes: sortImportMapScopes(importMap.scopes),
  }
  return orderedImportMap
}

const sortImportMapImports = (imports) => {
  const sortedImports = {}
  Object.keys(imports)
    .sort(compareLengthOrLocaleCompare)
    .forEach((name) => {
      sortedImports[name] = imports[name]
    })
  return sortedImports
}

const compareLengthOrLocaleCompare = (a, b) => {
  return b.length - a.length || a.localeCompare(b)
}

const sortImportMapScopes = (scopes) => {
  const sortedScopes = {}
  Object.keys(scopes)
    .sort(compareLengthOrLocaleCompare)
    .forEach((scopeName) => {
      sortedScopes[scopeName] = sortScopedImports(scopes[scopeName], scopeName)
    })
  return sortedScopes
}

const sortScopedImports = (scopedImports) => {
  const compareScopedImport = (a, b) => {
    // const aIsRoot = a === "/"
    // const bIsRoot = b === "/"
    // if (aIsRoot && !bIsRoot) return 1
    // if (!aIsRoot && bIsRoot) return -1
    // if (aIsRoot && bIsRoot) return 0

    // const aIsScope = a === scope
    // const bIsScope = b === scope
    // if (aIsScope && !bIsScope) return 1
    // if (!aIsScope && bIsScope) return -1
    // if (aIsScope && bIsScope) return 0

    return compareLengthOrLocaleCompare(a, b)
  }

  const sortedScopedImports = {}
  Object.keys(scopedImports)
    .sort(compareScopedImport)
    .forEach((name) => {
      sortedScopedImports[name] = scopedImports[name]
    })
  return sortedScopedImports
}
