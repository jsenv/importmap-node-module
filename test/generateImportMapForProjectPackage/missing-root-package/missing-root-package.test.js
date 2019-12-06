import { assert } from "@jsenv/assert"
import { urlToFilePath } from "../../../src/internal/urlUtils.js"
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
    message: `ENOENT: no such file or directory, open '${urlToFilePath(
      testDirectoryUrl,
    )}package.json'`,
  }
  assert({ actual, expected })
}
