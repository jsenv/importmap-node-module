# import map node module [![npm package](https://img.shields.io/npm/v/@jsenv/importmap-node-module.svg?logo=npm&label=package)](https://www.npmjs.com/package/@jsenv/importmap-node-module) [![github workflow](https://github.com/jsenv/importmap-node-module/workflows/main/badge.svg)](https://github.com/jsenv/importmap-node-module/actions?workflow=main) [![codecov coverage](https://codecov.io/gh/jsenv/importmap-node-module/branch/master/graph/badge.svg)](https://codecov.io/gh/jsenv/importmap-node-module)

Generates [import map](https://github.com/WICG/import-maps) with mappings corresponding to [node esm resolution algorithm](https://nodejs.org/docs/latest-v16.x/api/esm.html#esm_resolution_algorithm). This importmap can be used to make code dependent on node module resolution executable in a browser.

_Example of code relying on node module resolution_

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
      checkImportResolution: true,
    },
    "./importmap_for_prod.importmap": {
      mappingsForNodeResolution: true,
      checkImportResolution: true,
      removeUnusedMappings: true,
    },
  },
})
```

## projectDirectoryUrl

_projectDirectoryUrl_ parameter is a string url leading to a folder with a _package.json_.
This parameters is **required** and accepted values are documented in [@jsenv/filesystem#assertAndNormalizeDirectoryUrl](https://github.com/jsenv/filesystem/blob/main/docs/API.md#assertandnormalizedirectoryurl)

## importMapFiles

_importMapFiles_ parameter is an object where keys are importmap file relative urls and values are parameters controlling the mappings that will be written in the importmap file.

### mappingsForNodeResolution

When _mappingsForNodeResolution_ is enabled, the mappings required to implement node module resolution are generated.
The following source of information are used to create complete and coherent mappings in the importmap.

- Your _package.json_
- All dependencies declared in _package.json_ are searched into _node_modules_, recursively.
- In every _package.json_, `"main"`, `"exports"` and `"imports"` field.

> Be sure node modules are on your filesystem because we'll use the filesystem structure to generate the importmap. For that reason, you must use it after `npm install` or anything that is responsible to generate the node_modules folder and its content on your filesystem.

### mappingsForDevDependencies

When enabled, `"devDependencies"` declared in your _package.json_ are included in the generated importMap.

### manualImportMap

_manualImportMapp_ parameter is an importMap object. Mappings declared in this parameter are added to mappings generated for node resolution. This can be used to provide additional mappings and/or override node mappings.
This parameter is optional and by default it's an empty object.

```js
import { writeImportMapFiles } from "@jsenv/importmap-node-module"

await writeImportMapFiles({
  projectDirectoryUrl: new URL("./", import.meta.url),
  importMapFiles: {
    "./test.importmap": {
      manualImportMap: {
        imports: {
          "#env": "./env.js",
        },
      },
    },
  },
})
```

### checkImportResolution

_checkImportResolution_ is a boolean parameter controlling if script tries to resolve all import found in your js files using the importmap.

It is recommended to enable this parameter, it gives more confidence in the generated importmap and outputs nice logs for for imports that cannot be resolved.

This import resolution is auto enabled when [removeUnusedMappings](#removeUnusedMappings) or [extensionlessAutomapping](#extensionlessAutomapping) are used.

### removeUnusedMappings

_removeUnusedMappings_ parameter is a boolean controlling if mappings will be treeshaked according to the import found in your files.

During development, you can start or stop using a mapping often so it's convenient to have all mappings.

In production you likely want to keep only the mappings actually used by your js files. In that case enable removeUnusedMappings: it will drastically decrease the importmap file size.

### runtime

A string parameter indicating where the importmap will be used. The default runtime is `"browser"`.
The runtime is used to determine what to pick in [package.json conditions](https://nodejs.org/docs/latest-v16.x/api/packages.html#packages_conditions_definitions).

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

Controls which conditions are favored in [package.json conditions](https://nodejs.org/dist/latest-v15.x/docs/api/packages.html#packages_conditions_definitions).

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

### extensionlessAutomapping

_extensionlessAutomapping_ parameter is a boolean controlling if mappings are generated for import(s) without extension found in your js files. Should be combined with _magicExtensions_ as shown in the code below.

```js
import { writeImportMapFiles } from "@jsenv/importmap-node-module"

await writeImportMapFiles({
  projectDirectoryUrl: new URL("./", import.meta.url),
  importMapFiles: {
    "./test.importmap": {
      mappingsForNodeResolution: true,
    },
  },
})
```

## packagesManualOverrides

Ideally package.json should use `"exports"` field documented in https://nodejs.org/dist/latest-v16.x/docs/api/packages.html#packages_package_entry_points. But not every one has updated to this new field yet.

_packagesManualOverrides_ parameter is an object that can be used to override some of your dependencies package.json.

```js
import { writeImportMapFiles } from "@jsenv/importmap-node-module"

await writeImportMapFiles({
  projectDirectoryUrl: new URL("./", import.meta.url),
  importMapFiles: {
    "./test.importmap": {
      extensionlessAutomapping: true,
      magicExtensions: [".ts", ".tsx"],
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

# See also

- [Configuring VSCode and ESLint for importmap](./docs/vscode_and_eslint.md#configure-vscode-and-eslint-for-importmap)
