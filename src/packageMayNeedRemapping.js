export const packageMayNeedRemapping = (packageData) => {
  if ("module" in packageData) return true
  if ("jsnext:main" in packageData) return true
  return false
}
