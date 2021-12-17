import { createDetailedMessage } from "@jsenv/logger"
import {
  urlToFileSystemPath,
  urlToRelativeUrl,
  resolveUrl,
} from "@jsenv/filesystem"

export const createPreferExportsFieldWarning = ({
  packageInfo,
  packageEntryFieldName,
}) => {
  const packageName = packageInfo.object.name
  const packageEntrySpecifier = packageInfo.object[packageEntryFieldName]
  const exportsSubpathCondition =
    packageEntryFieldName === "browser" ? "browser" : "import"
  const suggestedOverride = {
    [packageName]: {
      exports: {
        [exportsSubpathCondition]: packageEntrySpecifier,
      },
    },
  }

  return {
    code: "PREFER_EXPORTS_FIELD",
    message: createDetailedMessage(
      `A package is using a non-standard "${packageEntryFieldName}" field. To get rid of this warning check suggestion below`,
      {
        "package.json path": urlToFileSystemPath(packageInfo.url),
        "suggestion": `Add the following into "packageManualOverrides"
${JSON.stringify(suggestedOverride, null, "  ")}
As explained in https://github.com/jsenv/importmap-node-module#packagesmanualoverrides`,
        ...getCreatePullRequestSuggestion({
          packageInfo,
          packageEntryFieldName,
        }),
      },
    ),
  }
}

export const createBrowserFieldNotImplementedWarning = ({ packageInfo }) => {
  const suggestedOverride = {
    [packageInfo.object.name]: {
      exports: {
        browser: packageInfo.object.browser,
      },
    },
  }

  return {
    code: "BROWSER_FIELD_NOT_IMPLEMENTED",
    message: createDetailedMessage(
      `Found an object "browser" field in a package.json, this is not supported.`,
      {
        "package.json path": urlToFileSystemPath(packageInfo.url),
        "suggestion": `Add the following into "packageManualOverrides"
${JSON.stringify(suggestedOverride, null, "  ")}
As explained in https://github.com/jsenv/importmap-node-module#packagesmanualoverrides`,
      },
    ),
  }
}

const getCreatePullRequestSuggestion = ({
  packageInfo,
  packageEntryFieldName,
}) => {
  const repositoryUrl = getRepositoryUrl(packageInfo)
  if (!repositoryUrl) {
    return null
  }
  return {
    "suggestion 2": `Create a pull request in ${repositoryUrl} to use "exports" instead of "${packageEntryFieldName}"`,
  }
}

const getRepositoryUrl = (packageInfo) => {
  const repository = packageInfo.object.repository
  if (typeof repository === "string") {
    return repository
  }
  if (typeof repository === "object") {
    return repository.url
  }
  return undefined
}

export const createPackageNameMustBeAStringWarning = ({
  packageName,
  packageInfo,
}) => {
  return {
    code: "PACKAGE_NAME_MUST_BE_A_STRING",
    message: createDetailedMessage(`Package name field must be a string`, {
      "package name field": packageName,
      "package.json path": urlToFileSystemPath(packageInfo.url),
    }),
  }
}

export const createImportResolutionFailedWarning = ({
  specifier,
  importTrace,
  importUrl,
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
        "import trace": importTrace,
        "reason": gotBareSpecifierError
          ? `there is no mapping for this bare specifier`
          : `file not found on filesystem at ${urlToFileSystemPath(importUrl)}`,
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
  importTrace,
  automapping,
}) => {
  return createDetailedMessage(`Auto mapping for "${specifier}"`, {
    "import trace": importTrace,
    "mapping": mappingToImportmapString(automapping),
    "reason": `bare specifier and "bareSpecifierAutomapping" enabled`,
  })
}

export const createExtensionAutomappingMessage = ({
  specifier,
  importTrace,
  automapping,
  mappingFoundInPackageExports,
}) => {
  return createDetailedMessage(`Auto mapping for "${specifier}"`, {
    "import trace": importTrace,
    "mapping": mappingToImportmapString(automapping),
    "reason": mappingFoundInPackageExports
      ? `mapping found in package exports`
      : `"bareSpecifierAutomapping" enabled`,
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
      addSuggestion(`use magicExtensions: ["inherit"]`)
    }
    addSuggestion(`add mapping to "manualImportMap"
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
