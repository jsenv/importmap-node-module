// https://nodejs.org/dist/latest-v13.x/docs/api/esm.html#esm_package_exports

import { urlToFileSystemPath, urlToRelativeUrl, resolveUrl } from "@jsenv/util"
import { specifierIsRelative } from "./specifierIsRelative.js"

export const visitPackageExports = ({
  packageFileUrl,
  packageJsonObject,
  packageExports = packageJsonObject.exports,
  packageName = packageJsonObject.name,
  projectDirectoryUrl,
  userConditions,
  warn,
}) => {
  const exportsSubpaths = {}
  const packageDirectoryUrl = resolveUrl("./", packageFileUrl)
  const packageDirectoryRelativeUrl = urlToRelativeUrl(packageDirectoryUrl, projectDirectoryUrl)

  const onExportsSubpath = ({ key, value, trace }) => {
    if (!specifierIsRelative(key)) {
      warn(
        createExportsSubpathKeyMustBeRelativeWarning({
          key,
          keyTrace: trace.slice(0, -1),
          packageFileUrl,
        }),
      )
      return
    }
    if (typeof value !== "string") {
      warn(
        createExportsSubpathValueMustBeAStringWarning({
          value,
          valueTrace: trace,
          packageFileUrl,
        }),
      )
      return
    }
    if (!specifierIsRelative(value)) {
      warn(
        createExportsSubpathValueMustBeRelativeWarning({
          value,
          valueTrace: trace,
          packageFileUrl,
        }),
      )
      return
    }

    const keyNormalized = specifierToSource(key, packageName)
    const valueNormalized = addressToDestination(value, packageDirectoryRelativeUrl)

    exportsSubpaths[keyNormalized] = valueNormalized
  }

  const visitSubpathValue = (subpathValue, subpathValueTrace) => {
    // false is allowed as alternative to exports: {}
    if (subpathValue === false) {
      handleFalse()
      return
    }

    if (typeof subpathValue === "string") {
      handleString(subpathValue, subpathValueTrace)
      return
    }

    if (typeof subpathValue === "object" && subpathValue !== null) {
      handleObject(subpathValue, subpathValueTrace)
      return
    }

    handleRemaining(subpathValue, subpathValueTrace)
  }

  const handleFalse = () => {
    // nothing to do
  }

  const handleString = (subpathValue, subpathValueTrace) => {
    const firstNonConditionKey = subpathValueTrace
      .slice()
      .reverse()
      .find((key) => key.startsWith("."))
    const key = firstNonConditionKey || "."
    onExportsSubpath({
      key,
      value: subpathValue,
      trace: subpathValueTrace,
    })
  }

  const handleObject = (subpathValue, subpathValueTrace) => {
    const keys = Object.keys(subpathValue)
    const everyKeyDoesNotStartsWithDot = keys.every((key) => !key.startsWith("."))
    if (everyKeyDoesNotStartsWithDot) {
      const bestConditionKey = findBestConditionKey(keys, userConditions)
      if (!bestConditionKey) {
        return
      }
      visitSubpathValue(subpathValue[bestConditionKey], [...subpathValueTrace, bestConditionKey])
      return
    }

    const everyKeyStartsWithDot = keys.every((key) => key.startsWith("."))
    if (everyKeyStartsWithDot) {
      keys.forEach((key) => {
        visitSubpathValue(subpathValue[key], [...subpathValueTrace, key])
      })
      return
    }

    // see https://nodejs.org/dist/latest-v13.x/docs/api/esm.html#esm_exports_sugar
    warn(
      createUnexpectedExportsSubpathWarning({
        subpathValue,
        subpathValueTrace,
        packageFileUrl,
      }),
    )
  }

  const handleRemaining = (subpathValue, subpathValueTrace) => {
    warn(
      createMixedExportsSubpathWarning({
        subpathValue,
        subpathValueTrace,
        packageFileUrl,
      }),
    )
  }

  visitSubpathValue(packageExports, ["exports"])

  return exportsSubpaths
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

const createUnexpectedExportsSubpathWarning = ({
  subpathValue,
  subpathValueTrace,
  packageFileUrl,
}) => {
  return {
    code: "EXPORTS_SUBPATH_UNEXPECTED",
    message: `unexpected value in package.json exports: value must be an object or a string.
--- value ---
${subpathValue}
--- value at ---
${subpathValueTrace.join(".")}
--- package.json path ---
${urlToFileSystemPath(packageFileUrl)}`,
  }
}

const createMixedExportsSubpathWarning = ({ subpathValue, subpathValueTrace, packageFileUrl }) => {
  return {
    code: "EXPORTS_SUBPATH_MIXED",
    message: `unexpected value in package.json exports: cannot mix conditional and subpath.
--- value ---
${JSON.stringify(subpathValue, null, "  ")}
--- value at ---
${subpathValueTrace.join(".")}
--- package.json path ---
${urlToFileSystemPath(packageFileUrl)}`,
  }
}

const createExportsSubpathKeyMustBeRelativeWarning = ({ key, keyTrace, packageFileUrl }) => {
  return {
    code: "EXPORTS_SUBPATH_KEY_MUST_BE_RELATIVE",
    message: `unexpected key in package.json exports: key must be relative.
--- key ---
${key}
--- key at ---
${keyTrace.join(".")}
--- package.json path ---
${urlToFileSystemPath(packageFileUrl)}`,
  }
}

const createExportsSubpathValueMustBeAStringWarning = ({ value, valueTrace, packageFileUrl }) => {
  return {
    code: "EXPORTS_SUBPATH_VALUE_MUST_BE_A_STRING",
    message: `unexpected value in package.json exports: value must be a string.
--- value ---
${value}
--- value at ---
${valueTrace.join(".")}
--- package.json path ---
${urlToFileSystemPath(packageFileUrl)}`,
  }
}

const createExportsSubpathValueMustBeRelativeWarning = ({ value, valueTrace, packageFileUrl }) => {
  return {
    code: "EXPORTS_SUBPATH_VALUE_MUST_BE_RELATIVE",
    message: `unexpected value in package.json exports: value must be relative.
--- value ---
${value}
--- value at ---
${valueTrace.join(".")}
--- package.json path ---
${urlToFileSystemPath(packageFileUrl)}`,
  }
}
