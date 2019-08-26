export const importMapToVsCodeConfigPaths = ({ imports = {} }) => {
  const paths = {}

  const handleImportsAt = (pathPattern, remappingValue) => {
    let path
    if (pathPattern.endsWith("/")) {
      path = `${pathPattern}*`
    } else {
      path = pathPattern
    }

    const remappingArray = typeof remappingValue === "string" ? [remappingValue] : remappingValue
    const candidates = remappingArray
      .filter((remapping) => !remapping.endsWith("/"))
      .map((remapping) => `.${remapping}`)

    if (candidates.length) {
      if (path in paths) {
        paths[path] = [...paths[path], ...candidates]
      } else {
        paths[path] = candidates
      }
    }
  }

  Object.keys(imports).forEach((importPattern) => {
    handleImportsAt(importPattern, imports[importPattern])
  })

  return paths
}
