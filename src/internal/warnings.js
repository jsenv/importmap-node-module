export const createPackageNameMustBeAStringWarning = ({ packageName, packageFileUrl }) => {
  return {
    code: "PACKAGE_NAME_MUST_BE_A_STRING",
    message: `package name field must be a string
--- package name field ---
${packageName}
--- package.json file path ---
${packageFileUrl}`,
  }
}
