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

- sinon
  -> suggerer que c'est une dépendance qu'il faut ajouter au package.json
  non plutot un log de type debug

si c'est pas un bare specifier et que le fichier est pas trouvé

-> warning et puis c'est tout

*/

import { createLogger, createDetailedMessage } from "@jsenv/logger"
import { readFile, urlToExtension } from "@jsenv/util"
import { resolveImport } from "@jsenv/import-map"
import {
  memoizeAsyncFunctionByUrl,
  memoizeAsyncFunctionBySpecifierAndImporter,
} from "../memoizeAsyncFunction.js"
import { parseSpecifiersFromFile } from "./parseSpecifiersFromFile.js"
import { showSource } from "./showSource.js"

const BARE_SPECIFIER_ERROR = {}

export const getImportMapFromJsFiles = async ({
  logLevel,
  importMap,
  projectDirectoryUrl,
  magicExtensions = [".js", ".jsx", ".ts", ".tsx", ".node", ".json"],
}) => {
  const logger = createLogger({ logLevel })

  const visitFile = async (specifier, importer, { importedBy }) => {
    let fileUrl
    let bareSpecifier = false

    try {
      fileUrl = resolveImport({
        specifier,
        importer,
        importMap,
        defaultExtension: false,
        createBareSpecifierError: () => BARE_SPECIFIER_ERROR,
      })
    } catch (e) {
      if (e !== BARE_SPECIFIER_ERROR) {
        throw e
      }
      bareSpecifier = true
    }

    // TODO: auto ajouter importer extension dans les magic extensions

    if (bareSpecifier) {
      // - s'il existe un fichier avec le meme nom
      // -> suggerer un remapping et lajouter de force
      // - si magic extension
      // -> suggerer un remapping et l'ajouter de force
    } else {
      // - si magic extension
      // -> suggerer un remapping et l'ajouter de force
    }

    if (!fileUrl) {
      logger.warn(
        formatFileNotFoundLog({
          specifier,
          importedBy,
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
        await visitFileMemoized(specifier, fileUrl, {
          importedBy: showSource({
            url: fileUrl,
            line: specifierInfo.line,
            column: specifierInfo.column,
            source: fileContent,
          }),
        })
      }),
    )
  }
  const visitFileMemoized = memoizeAsyncFunctionBySpecifierAndImporter(visitFile)

  const readFileContent = memoizeAsyncFunctionByUrl((fileUrl) => {
    return readFile(fileUrl, { as: "string" })
  })

  // TODO: it's not ./ but the packagename
  // found in package.json to get the main file
  await visitFileMemoized("./", projectDirectoryUrl, {
    importedBy: `getImportMapFromJsFiles`,
  })
}

const formatFileNotFoundLog = ({ specifier, expectedUrl, magicExtensions, importedBy }) => {
  return createDetailedMessage(`Cannot find file for "${specifier}"`, {
    "imported by": importedBy,
    "file url": expectedUrl,
    ...(urlToExtension(expectedUrl) === ""
      ? { ["extensions tried"]: magicExtensions.join(`,`) }
      : {}),
  })
}
