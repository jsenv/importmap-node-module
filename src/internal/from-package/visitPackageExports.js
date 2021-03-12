// https://nodejs.org/dist/latest-v13.x/docs/api/esm.html#esm_package_exports

import { urlToFileSystemPath, urlToRelativeUrl, resolveUrl } from "@jsenv/util"
import { specifierIsRelative } from "./specifierIsRelative.js"

export const visitPackageExports = ({
  warn,
  packageFileUrl,
  packageJsonObject,
  packageExports = packageJsonObject.exports,
  packageName = packageJsonObject.name,
  projectDirectoryUrl,
  packagesExportsPreference,
  onExport,
}) => {
  const packageDirectoryUrl = resolveUrl("./", packageFileUrl)
  const packageDirectoryRelativeUrl = urlToRelativeUrl(packageDirectoryUrl, projectDirectoryUrl)

  visitExportsSubpath(packageExports, packagesExportsPreference, {
    onUnexpectedPackageExports: ({ packageExportsValue, packageExportsValuePath }) => {
      warn(
        createExportsValueWarning({
          packageExportsValue,
          packageExportsValuePath,
          packageFileUrl,
        }),
      )
    },
    onMixedPackageExports: ({ packageExportsValue, packageExportsValuePath }) => {
      // see https://nodejs.org/dist/latest-v13.x/docs/api/esm.html#esm_exports_sugar
      warn(
        createExportsMixedWarning({
          packageExportsValue,
          packageExportsValuePath,
          packageFileUrl,
        }),
      )
    },
    onSubpathPackageExport: ({ key, value, valuePath }) => {
      if (!specifierIsRelative(key)) {
        warn(
          createExportsMappingKeyMustBeRelativeWarning({
            key,
            keyPath: valuePath.slice(0, -1),
            packageFileUrl,
          }),
        )
        return
      }
      if (typeof value !== "string") {
        warn(
          createExportsMappingValueMustBeAStringWarning({
            value,
            valuePath,
            packageFileUrl,
          }),
        )
        return
      }
      if (!specifierIsRelative(value)) {
        warn(
          createExportsMappingValueMustBeRelativeWarning({
            value,
            valuePath,
            packageFileUrl,
          }),
        )
        return
      }

      onExport({
        key: specifierToSource(key, packageName),
        value: addressToDestination(value, packageDirectoryRelativeUrl),
      })
    },
  })
}

const visitExportsSubpath = (
  packageExports,
  packageExportsConditions,
  { onUnexpectedPackageExports, onMixedPackageExports, onSubpathPackageExport },
) => {
  const visitValue = (packageExportsValue, { valuePath }) => {
    // false is allowed as alternative to exports: {}
    if (packageExportsValue === false) {
      return
    }

    if (typeof packageExportsValue === "string") {
      const firstNonConditionKey = valuePath
        .slice()
        .reverse()
        .find((key) => key.startsWith("."))
      const key = firstNonConditionKey || "."
      onSubpathPackageExport({
        value: packageExportsValue,
        valuePath,
        key,
      })
      return
    }

    if (typeof packageExportsValue !== "object" && packageExportsValue !== null) {
      onUnexpectedPackageExports({
        packageExportsValue,
        packageExportsValuePath: valuePath,
      })
      return
    }

    const keys = Object.keys(packageExportsValue)
    const everyKeyDoesNotStartsWithDot = keys.every((key) => !key.startsWith("."))
    if (everyKeyDoesNotStartsWithDot) {
      const bestConditionKey = findBestConditionKey(keys, packageExportsConditions)
      if (!bestConditionKey) {
        return
      }
      const bestExports = packageExportsValue[bestConditionKey]
      visitValue(bestExports, {
        valuePath: [...valuePath, bestConditionKey],
      })
      return
    }

    const everyKeyStartsWithDot = keys.every((key) => key.startsWith("."))
    if (everyKeyStartsWithDot) {
      keys.forEach((key) => {
        visitValue(packageExportsValue[key], {
          valuePath: [...valuePath, key],
        })
      })
      return
    }

    onMixedPackageExports({
      packageExportsValue,
      packageExportsValuePath: valuePath,
    })
  }
  visitValue(packageExports, {
    valuePath: ["exports"],
  })
}

const findBestConditionKey = (availableKeys, exportsConditions) => {
  const conditionKey = exportsConditions.find((key) => availableKeys.includes(key))
  if (conditionKey) {
    return conditionKey
  }

  if (availableKeys.includes("default")) {
    return "default"
  }

  return undefined
}

const specifierToSource = (specifier, packageName) => {
  if (specifier === ".") {
    return packageName
  }

  if (specifier[0] === "/") {
    return specifier
  }

  if (specifier.startsWith("./")) {
    return `${packageName}${specifier.slice(1)}`
  }

  return `${packageName}/${specifier}`
}

const addressToDestination = (address, packageDirectoryRelativeUrl) => {
  if (address[0] === "/") {
    return address
  }

  if (address.startsWith("./")) {
    return `./${packageDirectoryRelativeUrl}${address.slice(2)}`
  }

  return `./${packageDirectoryRelativeUrl}${address}`
}

const createExportsValueWarning = ({
  packageExportsValue,
  packageExportsValuePath,
  packageFileUrl,
}) => {
  return {
    code: "EXPORTS_VALUE",
    message: `unexpected value in package.json exports field: value must be an object or a string.
--- value ---
${packageExportsValue}
--- value path ---
${packageExportsValuePath.join(".")}
--- package.json path ---
${urlToFileSystemPath(packageFileUrl)}`,
  }
}

const createExportsMixedWarning = ({
  packageExportsValue,
  packageExportsValuePath,
  packageFileUrl,
}) => {
  return {
    code: "EXPORTS_MIXED",
    message: `unexpected package.json exports field: cannot mix conditional and subpath exports.
--- value ---
${JSON.stringify(packageExportsValue, null, "  ")}
--- value path ---
${packageExportsValuePath.join(".")}
--- package.json path ---
${urlToFileSystemPath(packageFileUrl)}`,
  }
}

const createExportsMappingKeyMustBeRelativeWarning = ({ key, keyPath, packageFileUrl }) => {
  return {
    code: "EXPORTS_MAPPING_KEY_MUST_BE_RELATIVE",
    message: `unexpected key in package.json exports field: key must be relative.
--- key ---
${key}
--- key path ---
${keyPath.join(".")}
--- package.json path ---
${urlToFileSystemPath(packageFileUrl)}`,
  }
}

const createExportsMappingValueMustBeAStringWarning = ({ value, valuePath, packageFileUrl }) => {
  return {
    code: "EXPORTS_MAPPING_VALUE_MUST_BE_A_STRING",
    message: `unexpected value in package.json exports field: value must be a string.
--- value ---
${value}
--- value path ---
${valuePath.join(".")}
--- package.json path ---
${urlToFileSystemPath(packageFileUrl)}`,
  }
}

const createExportsMappingValueMustBeRelativeWarning = ({ value, valuePath, packageFileUrl }) => {
  return {
    code: "EXPORTS_MAPPING_VALUE_MUST_BE_RELATIVE",
    message: `unexpected value in package.json exports field: value must be relative.
--- value ---
${value}
--- value path ---
${valuePath.join(".")}
--- package.json path ---
${urlToFileSystemPath(packageFileUrl)}`,
  }
}
