import { folderRead, fileStat } from "@dmail/helper"

export const readNodeModulesInsideFolder = async (folder) => {
  const nodeModules = []
  const nodeModulesFolderContent = await folderReadSubfolders(`${folder}`)

  await Promise.all(
    nodeModulesFolderContent.map(async (foldernameRelative) => {
      // .bin is not a node_module
      if (foldernameRelative === ".bin") return

      if (foldernameRelative[0] === "@") {
        const scopedNodeModulesWithoutScopePrefix = await readNodeModulesInsideFolder(
          `${folder}/${foldernameRelative}`,
        )
        const scopedNodeModules = scopedNodeModulesWithoutScopePrefix.map(
          (scopedFoldernameRelative) => `${foldernameRelative}/${scopedFoldernameRelative}`,
        )
        nodeModules.push(...scopedNodeModules)
      } else {
        nodeModules.push(foldernameRelative)
      }
    }),
  )
  return nodeModules
}

const folderReadSubfolders = async (folder) => {
  const subfolders = []
  const folderBasenameArray = await folderReadOptionnal(folder)

  await Promise.all(
    folderBasenameArray.map(async (basename) => {
      const pathname = `${folder}/${basename}`
      const stat = await fileStat(pathname)
      if (stat.isDirectory()) {
        subfolders.push(basename)
      }
    }),
  )

  return subfolders
}

const folderReadOptionnal = async (folder) => {
  try {
    return await folderRead(folder)
  } catch (e) {
    if (e && e.code === "ENOENT") {
      return []
    }
    throw e
  }
}
