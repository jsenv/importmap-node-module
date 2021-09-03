export const importMapToVsCodeConfigPaths = ({ imports = {} }) => {
  const paths = {}

  Object.keys(imports).forEach((importKey) => {
    const importValue = imports[importKey]

    let key
    if (importKey.endsWith("/")) {
      key = `${importKey}*`
    } else {
      key = importKey
    }

    const importValueArray =
      typeof importValue === "string" ? [importValue] : importValue
    const candidatesForPath = importValueArray.map((importValue) => {
      if (importValue.endsWith("/")) {
        return `${importValue}*`
      }
      return importValue
    })

    if (key in paths) {
      paths[key] = [...paths[key], ...candidatesForPath]
    } else {
      paths[key] = candidatesForPath
    }
  })

  return paths
}
