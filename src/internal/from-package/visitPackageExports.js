/*

https://nodejs.org/docs/latest-v15.x/api/packages.html#packages_node_js_package_json_field_definitions

*/

import {
  urlToFileSystemPath,
  urlToRelativeUrl,
  resolveUrl,
} from "@jsenv/filesystem"
import { specifierIsRelative } from "./specifierIsRelative.js"

export const visitPackageExports = ({
  projectDirectoryUrl,
  warn,
  packageInfo,
  packageExports = packageInfo.object.exports,
  packageName = packageInfo.name,
  nodeResolutionConditions = [],
}) => {
  const exportsSubpaths = {}
  const packageDirectoryUrl = resolveUrl("./", packageInfo.url)
  const packageDirectoryRelativeUrl = urlToRelativeUrl(
    packageDirectoryUrl,
    projectDirectoryUrl,
  )
  const onExportsSubpath = ({ key, value, trace }) => {
    if (!specifierIsRelative(value)) {
      warn(
        createSubpathValueMustBeRelativeWarning({
          value,
          valueTrace: trace,
          packageInfo,
        }),
      )
      return
    }

    const keyNormalized = specifierToSource(key, packageName)
    const valueNormalized = addressToDestination(
      value,
      packageDirectoryRelativeUrl,
    )
    exportsSubpaths[keyNormalized] = valueNormalized
  }

  const conditions = [...nodeResolutionConditions, "default"]

  const visitSubpathValue = (subpathValue, subpathValueTrace) => {
    // false is allowed as alternative to exports: {}
    if (subpathValue === false) {
      return handleFalse()
    }

    if (typeof subpathValue === "string") {
      return handleString(subpathValue, subpathValueTrace)
    }

    if (typeof subpathValue === "object" && subpathValue !== null) {
      return handleObject(subpathValue, subpathValueTrace)
    }

    return handleRemaining(subpathValue, subpathValueTrace)
  }

  const handleFalse = () => {
    // nothing to do
    return true
  }

  const handleString = (subpathValue, subpathValueTrace) => {
    const firstRelativeKey = subpathValueTrace
      .slice()
      .reverse()
      .find((key) => key.startsWith("."))
    const key = firstRelativeKey || "."
    onExportsSubpath({
      key,
      value: subpathValue,
      trace: subpathValueTrace,
    })
    return true
  }

  const handleObject = (subpathValue, subpathValueTrace) => {
    // From Node.js documentation:
    // "If a nested conditional does not have any mapping it will continue
    // checking the remaining conditions of the parent condition"
    // https://nodejs.org/docs/latest-v14.x/api/packages.html#packages_nested_conditions
    //
    // So it seems what we do here is not sufficient
    // -> if the condition finally does not lead to something
    // it should be ignored and an other branch be taken until
    // something resolves
    const followConditionBranch = (subpathValue, conditionTrace) => {
      const relativeKeys = []
      const conditionalKeys = []
      Object.keys(subpathValue).forEach((availableKey) => {
        if (availableKey.startsWith(".")) {
          relativeKeys.push(availableKey)
        } else {
          conditionalKeys.push(availableKey)
        }
      })

      if (relativeKeys.length > 0 && conditionalKeys.length > 0) {
        warn(
          createSubpathKeysAreMixedWarning({
            subpathValue,
            subpathValueTrace: [...subpathValueTrace, ...conditionTrace],
            packageInfo,
            relativeKeys,
            conditionalKeys,
          }),
        )
        return false
      }

      // there is no condition, visit all relative keys
      if (conditionalKeys.length === 0) {
        let leadsToSomething = false
        relativeKeys.forEach((key) => {
          leadsToSomething = visitSubpathValue(subpathValue[key], [
            ...subpathValueTrace,
            ...conditionTrace,
            key,
          ])
        })
        return leadsToSomething
      }

      // there is a condition, keep the first one leading to something
      return conditionalKeys.some((keyCandidate) => {
        if (!conditions.includes(keyCandidate)) {
          return false
        }
        const valueCandidate = subpathValue[keyCandidate]
        return visitSubpathValue(valueCandidate, [
          ...subpathValueTrace,
          ...conditionTrace,
          keyCandidate,
        ])
      })
    }

    if (Array.isArray(subpathValue)) {
      subpathValue = exportsObjectFromExportsArray(subpathValue)
    }
    return followConditionBranch(subpathValue, [])
  }

  const handleRemaining = (subpathValue, subpathValueTrace) => {
    warn(
      createSubpathIsUnexpectedWarning({
        subpathValue,
        subpathValueTrace,
        packageInfo,
      }),
    )
    return false
  }

  visitSubpathValue(packageExports, ["exports"])

  return exportsSubpaths
}

const exportsObjectFromExportsArray = (exportsArray) => {
  const exportsObject = {}

  exportsArray.forEach((exportValue) => {
    if (typeof exportValue === "object") {
      Object.assign(exportsObject, exportValue)
      return
    }
    if (typeof exportValue === "string") {
      exportsObject.default = exportValue
    }
  })

  return exportsObject
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

const createSubpathIsUnexpectedWarning = ({
  subpathValue,
  subpathValueTrace,
  packageInfo,
}) => {
  return {
    code: "EXPORTS_SUBPATH_UNEXPECTED",
    message: `unexpected subpath in package.json exports: value must be an object or a string.
--- value ---
${subpathValue}
--- value at ---
${subpathValueTrace.join(".")}
--- package.json path ---
${urlToFileSystemPath(packageInfo)}`,
  }
}

const createSubpathKeysAreMixedWarning = ({
  subpathValue,
  subpathValueTrace,
  packageInfo,
}) => {
  return {
    code: "EXPORTS_SUBPATH_MIXED_KEYS",
    message: `unexpected subpath keys in package.json exports: cannot mix relative and conditional keys.
--- value ---
${JSON.stringify(subpathValue, null, "  ")}
--- value at ---
${subpathValueTrace.join(".")}
--- package.json path ---
${urlToFileSystemPath(packageInfo)}`,
  }
}

const createSubpathValueMustBeRelativeWarning = ({
  value,
  valueTrace,
  packageInfo,
}) => {
  return {
    code: "EXPORTS_SUBPATH_VALUE_MUST_BE_RELATIVE",
    message: `unexpected subpath value in package.json exports: value must be a relative to the package.
--- value ---
${value}
--- value at ---
${valueTrace.join(".")}
--- package.json path ---
${urlToFileSystemPath(packageInfo)}`,
  }
}
