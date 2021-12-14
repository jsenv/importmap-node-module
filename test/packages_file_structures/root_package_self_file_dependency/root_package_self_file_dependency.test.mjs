import { assert } from "@jsenv/assert"
import {
  removeFileSystemNode,
  resolveUrl,
  writeSymbolicLink,
} from "@jsenv/filesystem"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const projectDirectoryUrl = resolveUrl("./root/", import.meta.url)
const testDirectoryUrl = resolveUrl("./dir/", projectDirectoryUrl)

await removeFileSystemNode(`${testDirectoryUrl}/node_modules/siesta`, {
  allowUseless: true,
})
await writeSymbolicLink({
  from: `${testDirectoryUrl}/node_modules/siesta`,
  to: projectDirectoryUrl,
})

const warnings = []
const importmaps = await writeImportMapFiles({
  projectDirectoryUrl: testDirectoryUrl,
  importMapFiles: {
    "test.importmap": {
      mappingsForNodeResolution: true,
      mappingsForDevDependencies: true,
      removeUnusedMappings: false,
      ignoreJsFiles: true,
    },
  },
  onWarn: (warning) => {
    warnings.push(warning)
  },
  writeFiles: false,
})
const actual = {
  warnings,
  importmaps,
}
const expected = {
  warnings: [],
  importmaps: {
    "test.importmap": {
      imports: {
        "awesome-isomorphic-app/": "./",
        "awesome-isomorphic-app": "./index",
        "siesta/": "./node_modules/siesta/",
        "siesta": "./node_modules/siesta/index",
      },
      scopes: {},
    },
  },
}
assert({ actual, expected })
await removeFileSystemNode(`${testDirectoryUrl}/node_modules/siesta`)
