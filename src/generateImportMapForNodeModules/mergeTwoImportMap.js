export const mergeTwoImportMap = (leftImportMap, rightImportMap) => {
  return {
    imports: mergeImports(leftImportMap.imports, rightImportMap.imports),
    scopes: mergeScopes(leftImportMap.scopes, rightImportMap.scopes),
  }
}

const mergeImports = (leftImports = {}, rightImports = {}) => {
  return { ...leftImports, ...rightImports }
}

const mergeScopes = (leftScopes = {}, rightScopes = {}) => {
  const scopes = { ...leftScopes }
  Object.keys(rightScopes).forEach((pathPattern) => {
    if (scopes.hasOwnProperty(pathPattern)) {
      scopes[pathPattern] = { ...scopes[pathPattern], ...rightScopes[pathPattern] }
    } else {
      scopes[pathPattern] = rightScopes[pathPattern]
    }
  })
  return scopes
}
