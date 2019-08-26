import { importMetaURLToFolderPath } from "@jsenv/operating-system-path"
import { assert } from "@dmail/assert"
import { generateImportMapForNodeModules } from "../../index.js"

const testFolderPath = importMetaURLToFolderPath(import.meta.url)

let actual
await generateImportMapForNodeModules({
  projectPath: testFolderPath,
  onWarn: (value) => {
    actual = value
  },
})
const expected = {
  code: "DEPENDENCY_NOT_FOUND",
  message: `cannot find a dependency.
--- dependency ---
whatever@*
--- required by ---
missing-package@0.0.1
--- package.json path ---
${testFolderPath}/package.json`,
  data: {
    packagePathname: `${testFolderPath}/package.json`,
    packageData: {
      name: "missing-package",
      version: "0.0.1",
      dependencies: { whatever: "*" },
    },
    dependencyName: "whatever",
    dependencyType: "dependency",
  },
}
assert({ actual, expected })
