# Table of contents

- [generateImportMapForProject](#generateImportMapForProject)
  - [importMapFile](#importMapFile)
  - [importMapFileRelativeUrl](#importMapFileRelativeUrl)
  - [importMapFileLog](#importMapFileLog)
- [getImportMapFromFile](#getImportMapFromFile)
  - [importMapFileUrl](#importMapFileUrl)

# generateImportMapForProject

`generateImportMapForProject` is an async function receiving an array of promise resolving to importmaps. It awaits for every importmap, compose them into one and write it into a file.

> This function is meant to be responsible of generating the final importMap file that a project uses.

For example code below will generate an import map from node_modules + a file + an inline importmap.

```js
import {
  getImportMapFromNodeModules,
  getImportMapFromFile,
  generateImportMapForProject,
} from "@jsenv/node-module-import-map"

const projectDirectoryUrl = new URL("./", import.meta.url)
const customImportMapFileUrl = new URL("./import-map-custom.importmap", projectDirectoryUrl)

await generateImportMapForProject(
  [
    getImportMapFromNodeModules({
      projectDirectoryUrl,
      projectPackageDevDependenciesIncluded: true,
    }),
    getImportMapFromFile(customImportMapFileUrl),
    {
      imports: {
        foo: "./bar.js",
      },
    },
  ],
  {
    projectDirectoryUrl,
    importMapFileRelativeUrl: "./import-map.importmap",
  },
)
```

— source code at [src/generateImportMapForProject.js](../src/generateImportMapForProject.js).

## importMapFile

`importMapFile` parameter is a boolean controling if importMap is written to a file. This parameters is optional and enabled by default.

## importMapFileRelativeUrl

`importMapFileRelativeUrl` parameter is a string controlling where importMap file is written. This parameter is optional and by default it's `"./import-map.importmap"`.

## importMapFileLog

`importMapFileLog` parameter a boolean controlling if there is log in the terminal when importMap file is written. This parameter is optional and by default it's enabled.

# getImportMapFromFile

`getImportMapFromFile` is an async function reading importmap from a file.

```js
import { getImportMapFromFile } from "@jsenv/node-module-import-map"

const importMapFileUrl = new URL("./import-map.importmap", import.meta.url)
const importMap = await getImportMapFromFile(importMapFileUrl)
```

— source code at [src/getImportMapFromFile.js](../src/getImportMapFromFile.js).

## importMapFileUrl

`importMapFileUrl` parameter a string or an url leading to the importmap file. This parameter is **required**.
