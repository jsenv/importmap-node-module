import { assert } from "@jsenv/assert"
import { urlToFileSystemPath } from "@jsenv/util"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryUrl = import.meta.resolve("./")

try {
  await generateImportMapForProjectPackage({
    projectDirectoryUrl: testDirectoryUrl,
    throwUnhandled: false,
  })
  throw new Error("should throw")
} catch (error) {
  const { code, message } = error
  const actual = { code, message }
  const expected = {
    code: "ENOENT",
    message: `ENOENT: no such file or directory, open '${urlToFileSystemPath(
      testDirectoryUrl,
    )}package.json'`,
  }
  assert({ actual, expected })
}
