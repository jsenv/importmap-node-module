import {
  writeFile,
  ensureEmptyDirectory,
  resolveUrl,
  readFile,
} from "@jsenv/filesystem"
import { assert } from "@jsenv/assert"

import { parseImportSpecifiers } from "@jsenv/importmap-node-module/src/internal/from-js/parseImportSpecifiers.js"

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
  const specifiers = await parseImportSpecifiers(fileUrl, {
    urlResponseText: await readFile(fileUrl),
  })
  const actual = specifiers
  const expected = {
    "./foo": {
      line: 1,
      column: 7,
      type: "import-static",
    },
    "./bar.js": {
      line: 2,
      column: 7,
      type: "import-static",
    },
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
  const specifiers = await parseImportSpecifiers(fileUrl, {
    urlResponseText: await readFile(fileUrl),
  })
  const actual = specifiers
  const expected = {
    "./foo": {
      line: 1,
      column: 7,
      type: "import-dynamic",
    },
  }
  assert({ actual, expected })
  await ensureEmptyDirectory(testDirectoryUrl)
}

// export from named
{
  await writeFile(fileUrl, `export {toto} from "./foo"`)
  const specifiers = await parseImportSpecifiers(fileUrl, {
    urlResponseText: await readFile(fileUrl),
  })
  const actual = specifiers
  const expected = {
    "./foo": {
      line: 1,
      column: 19,
      type: "export-named",
    },
  }
  assert({ actual, expected })
  await ensureEmptyDirectory(testDirectoryUrl)
}

// export from all
{
  await writeFile(fileUrl, `export * from "./foo"`)
  const specifiers = await parseImportSpecifiers(fileUrl, {
    urlResponseText: await readFile(fileUrl),
  })
  const actual = specifiers
  const expected = {
    "./foo": {
      line: 1,
      column: 14,
      type: "export-all",
    },
  }
  assert({ actual, expected })
  await ensureEmptyDirectory(testDirectoryUrl)
}
