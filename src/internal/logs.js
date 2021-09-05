import { createDetailedMessage } from "@jsenv/logger"
import {
  urlToFileSystemPath,
  urlToRelativeUrl,
  resolveUrl,
} from "@jsenv/filesystem"

export const createPackageNameMustBeAStringWarning = ({
  packageName,
  packageInfo,
}) => {
  return {
    code: "PACKAGE_NAME_MUST_BE_A_STRING",
    message: `package name field must be a string
--- package name field ---
${packageName}
--- package.json path ---
${urlToFileSystemPath(packageInfo.url)}`,
  }
}

export const createImportResolutionFailedWarning = ({
  specifier,
  importedBy,
  gotBareSpecifierError,
  magicExtension,
  suggestsNodeRuntime,
  automapping,
}) => {
  return {
    code: "IMPORT_RESOLUTION_FAILED",
    message: createDetailedMessage(
      `Import resolution failed for "${specifier}"`,
      {
        "import source": importedBy,
        "reason": gotBareSpecifierError
          ? `there is no mapping for this bare specifier`
          : `file not found on filesystem`,
        ...getImportResolutionFailedSuggestions({
          suggestsNodeRuntime,
          gotBareSpecifierError,
          magicExtension,
          automapping,
        }),
        // "extensions tried": magicExtensions.join(`, `),
      },
    ),
  }
}

export const createBareSpecifierAutomappingMessage = ({
  specifier,
  importedBy,
  automapping,
}) => {
  return createDetailedMessage(`Auto mapping for "${specifier}"`, {
    "import source": importedBy,
    "mapping": mappingToImportmapString(automapping),
    "reason": `bare specifier and "bareSpecifierAutomapping" enabled`,
  })
}

export const createExtensionLessAutomappingMessage = ({
  specifier,
  importedBy,
  automapping,
  mappingFoundInPackageExports,
}) => {
  return createDetailedMessage(`Auto mapping for "${specifier}"`, {
    "import source": importedBy,
    "mapping": mappingToImportmapString(automapping),
    "reason": mappingFoundInPackageExports
      ? `no file extension and mapping found in package exports`
      : `no file extension and "bareSpecifierAutomapping" enabled`,
  })
}

const getImportResolutionFailedSuggestions = ({
  suggestsNodeRuntime,
  gotBareSpecifierError,
  magicExtension,
  automapping,
}) => {
  const suggestions = {}

  const addSuggestion = (suggestion) => {
    const suggestionCount = Object.keys(suggestions).length
    suggestions[`suggestion ${suggestionCount + 1}`] = suggestion
  }

  if (suggestsNodeRuntime) {
    addSuggestion(`use runtime: "node"`)
  }
  if (automapping) {
    addSuggestion(
      `update import specifier to "${mappingToUrlRelativeToFile(automapping)}"`,
    )
    if (gotBareSpecifierError) {
      addSuggestion(`use bareSpecifierAutomapping: true`)
    }
    if (magicExtension) {
      addSuggestion(`use extensionlessAutomapping: true`)
    }
    addSuggestion(`add mapping to "initialImportMap"
${mappingToImportmapString(automapping)}`)
  }

  return suggestions
}

const mappingToUrlRelativeToFile = (mapping) => {
  if (!mapping.scope) {
    return mapping.to
  }
  const scopeUrl = resolveUrl(mapping.scope, "file:///")
  const toUrl = resolveUrl(mapping.to, "file:///")
  return `./${urlToRelativeUrl(toUrl, scopeUrl)}`
}

const mappingToImportmapString = ({ scope, from, to }) => {
  if (scope) {
    return JSON.stringify(
      {
        scopes: {
          [scope]: {
            [from]: to,
          },
        },
      },
      null,
      "  ",
    )
  }

  return JSON.stringify(
    {
      imports: {
        [from]: to,
      },
    },
    null,
    "  ",
  )
}

// const mappingToExportsFieldString = ({ scope, from, to }) => {
//   if (scope) {
//     const scopeUrl = resolveUrl(scope, "file://")
//     const toUrl = resolveUrl(to, "file://")
//     to = `./${urlToRelativeUrl(toUrl, scopeUrl)}`
//   }

//   return JSON.stringify(
//     {
//       exports: {
//         [from]: to,
//       },
//     },
//     null,
//     "  ",
//   )
// }
