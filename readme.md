# import map node module [![npm package](https://img.shields.io/npm/v/@jsenv/importmap-node-module.svg?logo=npm&label=package)](https://www.npmjs.com/package/@jsenv/importmap-node-module) [![github workflow](https://github.com/jsenv/importmap-node-module/workflows/main/badge.svg)](https://github.com/jsenv/importmap-node-module/actions?workflow=main) [![codecov coverage](https://codecov.io/gh/jsenv/importmap-node-module/branch/master/graph/badge.svg)](https://codecov.io/gh/jsenv/importmap-node-module)

Generate [import map](https://github.com/WICG/import-maps) file with mappings corresponding to [node esm resolution algorithm](https://nodejs.org/docs/latest-v16.x/api/esm.html#esm_resolution_algorithm). It can be used to make code dependent on node module resolution executable in a browser.

_Example of code relying on node module resolution:_

```js
import lodash from "lodash"
```

# Usage

1 - Install _@jsenv/importmap-node-module_

```console
npm install --save-dev @jsenv/importmap-node-module
```

2 - Create _generate_importmap.mjs_

```js
import { writeImportMapFiles } from "@jsenv/importmap-node-module"

await writeImportMapFiles({
  projectDirectoryUrl: new URL("./", import.meta.url),
  importMapFiles: {
    "./project.importmap": {
      mappingsForNodeResolution: true,
    },
  },
})
```

3 - Generate _project.importmap_

```console
node ./generate_importmap.mjs
```

4 - Add _project.importmap_ to your html

```diff
<!DOCTYPE html>
<html>
  <head>
    <title>Title</title>
    <meta charset="utf-8" />
    <link rel="icon" href="data:," />
+   <script type="importmap" src="./project.importmap"></script>
  </head>

  <body>
    <script type="module">
      import lodash from "lodash"
    </script>
  </body>
</html>
```

If you use a bundler or an other tool, be sure it's compatible with import maps.
As import map are standard the bundler/tool might be compatible by default or with the help of some plugin/configuration.
If you don't know what to use, check [@jsenv/core](https://github.com/jsenv/jsenv-core#presentation).

At this stage you have generated an importmap file with mappings corresponding to how node resolve imports.
You can read the rest of this document to go further.

# writeImportMapFiles

_writeImportMapFiles_ is an async function generating one or many importmap files.

```js
import { writeImportMapFiles } from "@jsenv/importmap-node-module"

await writeImportMapFiles({
  projectDirectoryUrl: new URL("./", import.meta.url),
  importMapFiles: {
    "./importmap_for_dev.importmap": {
      mappingsForNodeResolution: true,
      mappingsForDevDependencies: true,
    },
    "./importmap_for_prod.importmap": {
      mappingsForNodeResolution: true,
    },
  },
})
```

## projectDirectoryUrl

_projectDirectoryUrl_ is a string/url leading to a folder with a _package.json_.

_projectDirectoryUrl_ is **required**.

## importMapFiles

_importMapFiles_ is an object where keys are file relative urls and value are objects configuring which mappings will be written in the importmap files.

_importMapFiles_ is **required**.

### mappingsForNodeResolution

_mappingsForNodeResolution_ is a boolean. When enabled mappings required to implement node module resolution are generated.

_mappingsForNodeResolution_ is optional.

> Be sure node modules are on your filesystem because we'll use the filesystem structure to generate the importmap. For that reason, you must use it after `npm install` or anything that is responsible to generate the node_modules folder and its content on your filesystem.

### mappingsForDevDependencies

_mappingsForDevDependencies_ is a boolean. When enabled, `"devDependencies"` declared in your _package.json_ are included in the generated importMap.

_mappingsForDevDependencies_ is optional.

### runtime

_runtime_ is a string used to determine what to pick in [package.json conditions](https://nodejs.org/docs/latest-v16.x/api/packages.html#packages_conditions_definitions).

_runtime_ is optional and defaults to `"browser"`.

```js
import { writeImportMapFiles } from "@jsenv/importmap-node-module"

await writeImportMapFiles({
  projectDirectoryUrl: new URL("./", import.meta.url),
  importMapFiles: {
    "./browser.importmap": {
      mappingsForNodeResolution: true,
      runtime: "browser",
    },
    "./node.importmap": {
      mappingsForNodeResolution: true,
      runtime: "node",
    },
  },
})
```

### packageUserConditions

_packageUserConditions_ is an array controlling which conditions are favored in [package.json conditions](https://nodejs.org/dist/latest-v15.x/docs/api/packages.html#packages_conditions_definitions).

_packageUserConditions_ is optional.

```js
import { writeImportMapFiles } from "@jsenv/importmap-node-module"

await writeImportMapFiles({
  projectDirectoryUrl: new URL("./", import.meta.url),
  importMapFiles: {
    "./dev.importmap": {
      mappingsForNodeResolution: true,
      packageUserConditions: ["development"],
    },
    "./prod.importmap": {
      mappingsForNodeResolution: true,
      packageUserConditions: ["production"],
    },
  },
})
```

### manualImportMap

_manualImportMap_ is an object containing mappings that will be added to the importmap. This can be used to provide additional mappings and/or override node mappings.

_manualImportMap_ is optional.

```js
import { writeImportMapFiles } from "@jsenv/importmap-node-module"

await writeImportMapFiles({
  projectDirectoryUrl: new URL("./", import.meta.url),
  importMapFiles: {
    "./test.importmap": {
      mappingsForNodeResolution: true,
      manualImportMap: {
        imports: {
          "#env": "./env.js",
        },
      },
    },
  },
})
```

### entryPointsToCheck

_entryPointsToCheck_ is an array composed of string representing file relative urls. Each file is considered as an entry point using the import mappings. For each entry point, _writeImportMapFiles_ will check if import can be resolved and repeat this process for every static and dynamic import.

_entryPointsToCheck_ is optional.

```js
import { writeImportMapFiles } from "@jsenv/importmap-node-module"

await writeImportMapFiles({
  projectDirectoryUrl: new URL("./", import.meta.url),
  importMapFiles: {
    "./project.importmap": {
      mappingsForNodeResolution: true,
      entryPointsToCheck: ["./main.js"],
    },
  },
})
```

It is recommended to use _entryPointsToCheck_ as it gives confidence in the generated importmap. When an import cannot be resolved, a warning is logged.

### magicExtensions

_magicExtensions_ is an array of strings. Each string represent an extension that will be tried when an import cannot be resolved to a file.

_magicExtensions_ is optional. It must be used with _entryPointsToCheck_.

```js
import { writeImportMapFiles } from "@jsenv/importmap-node-module"

await writeImportMapFiles({
  projectDirectoryUrl: new URL("./", import.meta.url),
  importMapFiles: {
    "./test.importmap": {
      mappingsForNodeResolution: true,
      entryPointsToCheck: ["./main.js"],
      magicExtensions: ["inherit", ".js"],
    },
  },
})
```

`"inherit"` means the extension tried in taken from the importer.

```js
import "./helper"
```

| importer path        | path tried             |
| -------------------- | ---------------------- |
| /Users/dmail/file.js | /Users/dmail/helper.js |
| /Users/dmail/file.ts | /Users/dmail/helper.ts |

All other values in _magicExtensions_ are file extensions that will be tried one after an other.

### removeUnusedMappings

_removeUnusedMappings_ is a boolean. When enabled mappings will be treeshaked according to the import found in js files.

_removeUnusedMappings_ is optional. It must be used with _entryPointsToCheck_.

```js
import { writeImportMapFiles } from "@jsenv/importmap-node-module"

await writeImportMapFiles({
  projectDirectoryUrl: new URL("./", import.meta.url),
  importMapFiles: {
    "./test.importmap": {
      mappingsForNodeResolution: true,
      entryPointsToCheck: ["./main.js"],
      removeUnusedMappings: true,
    },
  },
})
```

It is recommended to enable _removeUnusedMappings_ so that importmap contains only the mappings actually used by your codebase.

## packagesManualOverrides

_packagesManualOverrides_ is an object that can be used to override some of your dependencies package.json.

_packagesManualOverrides_ is optional.

_packagesManualOverrides_ exists in case some of your dependencies use non standard fields to configure their entry points in their _package.json_. Ideally they should use `"exports"` field documented in https://nodejs.org/dist/latest-v16.x/docs/api/packages.html#packages_package_entry_points. But not every one has updated to this new field yet.

```js
import { writeImportMapFiles } from "@jsenv/importmap-node-module"

await writeImportMapFiles({
  projectDirectoryUrl: new URL("./", import.meta.url),
  importMapFiles: {
    "./test.importmap": {
      mappingsForNodeResolution: true,
    },
  },
  // overrides "react-redux" package because it uses a non-standard "module" field
  // to expose "es/index.js" entry point
  // see https://github.com/reduxjs/react-redux/blob/9021feb9ff573b01b73084f1a7d10b322e6f0201/package.json#L18
  packageManualOverrides: {
    "react-redux": {
      exports: {
        import: "./es/index.js",
      },
    },
  },
})
```

# TypeScript

This repository can generate importmap to make code produced by the TypeScript compiler executable in a browser.

You need to have your _package.json_ and _node_modules_ into the directory where typescript output js files.
You can achieve this with the following "scripts" in your _package.json_.

```json
{
  "scripts": {
    "prebuild": "rm -rf dist",
    "build": "tsc",
    "postbuild": "cp package.json dist && ln -sf ../node_modules ./dist/node_modules"
  }
}
```

Then you can use the script below to produce the importmap.

```js
import { writeImportMapFiles } from "@jsenv/importmap-node-module"

await writeImportMapFiles({
  projectDirectoryUrl: new URL("./dist/", import.meta.url),
  importMapFiles: {
    "./project.importmap": {
      mappingsForNodeResolution: true,
      entryPointsToCheck: ["./index.js"],
      magicExtensions: ["inherit"],
      removeUnusedMappings: true,
    },
  },
})
```

# See also

- [Configuring VSCode and ESLint for importmap](./docs/vscode_and_eslint.md#configure-vscode-and-eslint-for-importmap)
