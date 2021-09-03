export const applyPackageManualOverride = (
  packageObject,
  packagesManualOverrides,
) => {
  const { name, version } = packageObject
  const overrideKey = Object.keys(packagesManualOverrides).find(
    (overrideKeyCandidate) => {
      if (name === overrideKeyCandidate) {
        return true
      }
      if (`${name}@${version}` === overrideKeyCandidate) {
        return true
      }
      return false
    },
  )
  if (overrideKey) {
    return composeObject(packageObject, packagesManualOverrides[overrideKey])
  }
  return packageObject
}

const composeObject = (leftObject, rightObject) => {
  const composedObject = {
    ...leftObject,
  }
  Object.keys(rightObject).forEach((key) => {
    const rightValue = rightObject[key]

    if (
      rightValue === null ||
      typeof rightValue !== "object" ||
      key in leftObject === false
    ) {
      composedObject[key] = rightValue
    } else {
      const leftValue = leftObject[key]
      if (leftValue === null || typeof leftValue !== "object") {
        composedObject[key] = rightValue
      } else {
        composedObject[key] = composeObject(leftValue, rightValue)
      }
    }
  })
  return composedObject
}
