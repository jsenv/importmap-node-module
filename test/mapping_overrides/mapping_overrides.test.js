import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/filesystem"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)
const test = async (options) => {
  const importmaps = await writeImportMapFiles({
    projectDirectoryUrl: testDirectoryUrl,
    importMapFiles: {
      "test.importmap": {
        mappingsForNodeResolution: true,
        mappingOverrides: {
          scopes: {
            "./node_modules/react-redux/": {
              "react": "./node_modules/preact/compat/src/index.js",
              "react-dom": "./node_modules/preact/compat/src/index.js",
            },
          },
        },
        ...options,
      },
    },
    writeFiles: false,
  })
  return importmaps["test.importmap"]
}

// initialImportMap is not enough (it gets overridden by package.json)
{
  const actual = await test({
    initialImportMap: {
      scopes: {
        "./node_modules/react-redux/": {
          react: "./node_modules/preact/compat/src/index.js",
        },
      },
    },
  })
  const expected = {
    imports: {
      "react-redux/": "./node_modules/react-redux/",
      "react-redux": "./node_modules/react-redux/index.js",
      "root/": "./",
      "root": "./index.js",
    },
    scopes: {
      "./node_modules/react-redux/": {
        // Here we would like to find "preact" instead of "react"
        "react/": "./node_modules/react/",
        "react": "./node_modules/react/index.js",
      },
      "./node_modules/react/": {
        "react/": "./node_modules/react/",
      },
    },
  }
  assert({ actual, expected })
}

// terminalImportMap allows to override the mapping found in package.json
{
  const actual = await test({
    terminalImportMap: {
      scopes: {
        "./node_modules/react-redux/": {
          react: "./node_modules/preact/compat/src/index.js",
        },
      },
    },
  })
  const expected = {
    imports: {
      "react-redux/": "./node_modules/react-redux/",
      "react-redux": "./node_modules/react-redux/index.js",
      "root/": "./",
      "root": "./index.js",
    },
    scopes: {
      "./node_modules/react-redux/": {
        "react/": "./node_modules/react/",
        "react": "./node_modules/preact/compat/src/index.js", // GOOD
      },
      "./node_modules/react/": {
        "react/": "./node_modules/react/",
      },
    },
  }
  assert({ actual, expected })
}
