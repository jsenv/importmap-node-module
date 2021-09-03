import { urlToFileSystemPath } from "@jsenv/filesystem"

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
