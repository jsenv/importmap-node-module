/*

IL SERAIT BIEN DE CONNAITRE TOUTES LES IMPORTMAPS
POUR PAS DIRE DE BETISES:
- que ce soit parce que un bare specifier n'a pas de remapping
-> on pourrait ne pas log de warning dans ce cas
mais c'est dommage

- ou parce que on trouve pas un fichier (parce qu'il serait remap ailleurs sans etre un bare specifier)
-> use case rare mais pourquoi pas

pour chaque bare specifier error
(donc pas dans importmap des node_modules)

- s'il existe un fichier avec le meme nom
  -> suggerer un remapping et lajouter de force
- si en ajoutant une extension
  -> suggerer un remapping et l'ajouter de force
- sinon
  -> suggerer que c'est une dépendance qu'il faut ajouter au package.json
  non plutot un log de type debug

si c'est pas un bare specifier et que le fichier est pas trouvé
- si magic extension
  -> suggerer un remapping et l'ajouter de force
-> warning et puis c'est tout

*/

import { createDetailedMessage } from "@jsenv/logger"
import { readFile, resolveUrl, urlToExtension } from "@jsenv/util"
// import { resolveImport } from "@jsenv/import-map"
import { memoizeAsyncFunctionByUrl } from "../memoizeAsyncFunctionByUrl.js"
import { parseSpecifiersFromFile } from "./parseSpecifiersFromFile.js"
import { showSource } from "./showSource.js"

export const getImportMapFromCodebase = async ({
  logger,
  projectDirectoryUrl,
  magicExtensions = [".js", ".jsx", ".ts", ".tsx", ".node", ".json"],
  target,
  packagePreferences,
}) => {
  const visitFile = async (specifier, importer, { importedIn }) => {
    const fileUrl = await resolveUrl({
      specifier,
      importer,
      magicExtensions,
    })

    if (!fileUrl) {
      logger.warn(
        formatFileNotFoundLog({
          specifier,
          importedIn,
          magicExtensions,
        }),
      )
      return
    }

    const fileContent = await readFileContent(fileUrl)
    const specifiers = await parseSpecifiersFromFile(fileUrl, { fileContent })

    await Promise.all(
      Object.keys(specifiers).map(async (specifier) => {
        const specifierInfo = specifiers[specifier]
        await visitFile(specifier, fileUrl, {
          importedIn: showSource({
            url: fileUrl,
            line: specifierInfo.line,
            column: specifierInfo.column,
            source: fileContent,
          }),
        })
      }),
    )
  }
  const visitFileMemoized = memoizeAsyncFunctionByUrl(visitFile)

  const readFileContent = memoizeAsyncFunctionByUrl((fileUrl) => {
    return readFile(fileUrl, { as: "string" })
  })

  const rootPackageFileUrl = resolveUrl("package.json", projectDirectoryUrl)
  const rootPackageObject = await readFileContent(rootPackageFileUrl)
  const rootMainInfo = mainFromPackageObject({
    packageObject: rootPackageObject,
    packageFileUrl: rootPackageFileUrl,
    target,
    packagePreferences,
  })
  await visitFileMemoized(rootMainInfo.specifier, rootPackageFileUrl, {
    importedIn: rootMainInfo.importedIn,
  })
}

const mainFromPackageObject = ({ packageObject, packageFileUrl, target }) => {
  // idéalement on lirait aussi package.exports
  // pour y trouver le point d'entrée principal
  // soit ".", soit la chaine directe

  if ("module" in packageObject) {
    return {
      specifier: packageObject.module,
      importedIn: `${packageFileUrl}#module`,
    }
  }

  if ("jsnext:main" in packageObject) {
    return {
      specifier: packageObject["jsnext:main"],
      importedIn: `${packageFileUrl}#jsnext:main`,
    }
  }

  if (target === "browser" && "browser" in packageObject) {
    return {
      specifier: packageObject.browser,
      importedIn: `${packageFileUrl}#browser`,
    }
  }

  if ("main" in packageObject) {
    return {
      specifier: packageObject.main,
      importedIn: `${packageFileUrl}#main`,
    }
  }

  return {
    specifier: "index",
    importedIn: `${packageFileUrl}#default`,
  }
}

const formatFileNotFoundLog = ({ specifier, expectedUrl, magicExtensions, importedIn }) => {
  return createDetailedMessage(`Cannot find file for "${specifier}"`, {
    "imported in": importedIn,
    "file url": expectedUrl,
    ...(urlToExtension(expectedUrl) === ""
      ? { ["extensions tried"]: magicExtensions.join(`,`) }
      : {}),
  })
}
