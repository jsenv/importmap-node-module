import { parseSpecifiersFromFile } from "./parseSpecifiersFromFile.js"
import { writeFile, ensureEmptyDirectory, resolveUrl } from "@jsenv/filesystem"
import { assert } from "@jsenv/assert"

const testDirectoryUrl = resolveUrl("./fixtures/", import.meta.url)
const fileUrl = resolveUrl("test.js", testDirectoryUrl)

// static top level import
{
  await writeFile(
    fileUrl,
    `import "./foo"
import "./bar.js"
`,
  )
  const specifiers = await parseSpecifiersFromFile(fileUrl)
  const actual = specifiers
  const expected = {
    "./foo": { type: "import-static" },
    "./bar.js": { type: "import-static" },
  }
  assert({ actual, expected })
  await ensureEmptyDirectory(testDirectoryUrl)
}

// dynamic top level import
{
  await writeFile(
    fileUrl,
    `import("./foo")
import(id)
`,
  )
  const specifiers = await parseSpecifiersFromFile(fileUrl)
  const actual = specifiers
  const expected = {
    "./foo": { type: "import-dynamic" },
  }
  assert({ actual, expected })
  await ensureEmptyDirectory(testDirectoryUrl)
}

// export from named
{
  await writeFile(fileUrl, `export {toto} from "./foo"`)
  const specifiers = await parseSpecifiersFromFile(fileUrl)
  const actual = specifiers
  const expected = {
    "./foo": { type: "export-named" },
  }
  assert({ actual, expected })
  await ensureEmptyDirectory(testDirectoryUrl)
}

// export from all
{
  await writeFile(fileUrl, `export * from "./foo"`)
  const specifiers = await parseSpecifiersFromFile(fileUrl)
  const actual = specifiers
  const expected = {
    "./foo": { type: "export-all" },
  }
  assert({ actual, expected })
  await ensureEmptyDirectory(testDirectoryUrl)
}
