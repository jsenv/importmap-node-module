# node-module-import-map

Generate importmap for node_modules.

[![github package](https://img.shields.io/github/package-json/v/jsenv/jsenv-node-module-import-map.svg?logo=github&label=package)](https://github.com/jsenv/jsenv-node-module-import-map/packages)
[![npm package](https://img.shields.io/npm/v/@jsenv/node-module-import-map.svg?logo=npm&label=package)](https://www.npmjs.com/package/@jsenv/node-module-import-map)
[![github ci](https://github.com/jsenv/jsenv-node-module-import-map/workflows/ci/badge.svg)](https://github.com/jsenv/jsenv-node-module-import-map/actions?workflow=ci)
[![codecov coverage](https://codecov.io/gh/jsenv/jsenv-node-module-import-map/branch/master/graph/badge.svg)](https://codecov.io/gh/jsenv/jsenv-node-module-import-map)

# Table of contents

- [Presentation](#Presentation)
- [Usage](#Usage)
- [Extensionless import warning](#Extensionless-import-warning)
- [Subpath import warning](#Subpath-import-warning)
- [generateImportMapForProject](#generateImportMapForProject)
- [getImportMapFromNodeModules](#getImportMapFromNodeModules)
- [getImportMapFromFile](#getImportMapFromFile)
- [Custom node module resolution](#custom-node-module-resolution)
- [Concrete example](#concrete-example)

# Presentation

This repository generates [import map](https://github.com/WICG/import-maps) from `package.json` files in your `node_modules` directory. The generated importmap can be used to make code dependent of node module executable in a browser.

<details>
  <summary>See code relying on node module resolution</summary>

```js
import lodash from "lodash"
```

> The code above is expecting Node.js to "magically" find file corresponding to `"lodash"`. This magic is the [node module resolution algorith](https://nodejs.org/api/modules.html#modules_all_together).

> Other runtimes than Node.js, a browser like Chrome for instance, don't have this algorithm. Executing that code in a browser fetches `http://example.com/lodash` and likely results in `404 File Not Found` from server.

</details>

# Usage

<details>
  <summary>1 - Install <code>@jsenv/node-module-import-map</code></summary>

```console
npm install --save-dev @jsenv/node-module-import-map
```

</details>

<details>
  <summary>2 - Create <code>generate-import-map.js</code></summary>

```js
import {
  getImportMapFromNodeModules,
  generateImportMapForProject,
} from "@jsenv/node-module-import-map"

const projectDirectoryUrl = new URL("./", import.meta.url)

await generateImportMapForProject(
  [
    getImportMapFromNodeModules({
      projectDirectoryUrl,
    }),
  ],
  {
    projectDirectoryUrl,
    importMapFileRelativeUrl: "./project.importmap",
  },
)
```

<details>
  <summary>See commonjs equivalent of code above</summary>

```js
const {
  getImportMapFromNodeModules,
  generateImportMapForProject,
} = require("@jsenv/node-module-import-map")

const projectDirectoryUrl = __dirname

await generateImportMapForProject(
  [
    getImportMapFromNodeModules({
      projectDirectoryUrl,
    }),
  ],
  {
    projectDirectoryUrl,
    importMapFileRelativeUrl: "./project.importmap",
  },
)
```

</details>

</details>

<details>
  <summary>3 - Generate <code>project.importmap</code></summary>

```console
node generate-import-map.js
```

</details>

<details>
  <summary>4 - Add <code>project.importmap</code> to your html</summary>

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Title</title>
    <meta charset="utf-8" />
    <link rel="icon" href="data:," />
    <script type="importmap" src="./project.importmap"></script>
  </head>

  <body>
    <script type="module">
      import lodash from "lodash"
    </script>
  </body>
</html>
```

If you use a bundler, be sure it's compatible with import maps.

> Because import map are standard, you can expect your bundler to be already compatible or to become compatible without plugin in a near future.

> [@jsenv/core](https://github.com/jsenv/jsenv-core) seamlessly supports importmap during development, unit testing and when building for production.

</details>

# Extensionless import warning

If the code you wants to run contains one ore more extensionless path specifier, it will not be found by a browser (not even by Node.js).

<details>
  <summary>extensionless import example</summary>

```js
import { foo } from "./file"
```

</details>

In this situation, you can do one of the following:

1. Add extension in the source file
2. If there is a build step, ensure extension are added during the build
3. Add remapping in `exports` field of your `package.json`

```json
{
  "exports": {
    "./file": "./file.js"
  }
}
```

4. Remap manually each extensionless import and pass that importmap in [importMapInputs](#importMapInputs)

# Subpath import warning

The generation of importmap takes into account `exports` field from `package.json`. These `exports` field are used to allow subpath imports.

<details>
  <summary>subpath import example</summary>

```js
import { foo } from "my-module/feature/index.js"
import { bar } from "my-module/feature-b"
```

For the above import to work, `my-module/package.json` must contain the following `exports` field.

```json
{
  "name": "my-module",
  "exports": {
    "./*": "./*",
    "./feature-b": "./feature-b/index.js"
  }
}
```

Read more in [Node.js documentation about package entry points](https://nodejs.org/dist/latest-v15.x/docs/api/packages.html#packages_package_entry_points)

</details>

Node.js allows to put `*` in `exports` field. There is an importmap equivalent when `*` is used for directory/folder remapping.

```json
{
  "exports": {
    "./feature/*": "./feature/*"
  }
}
```

Becomes the following importmap

```json
{
  "imports": {
    "./feature/": "./feature/"
  }
}
```

However using `*` to add file extension as in

```json
{
  "exports": {
    "./feature/*": "./feature/*.js"
  }
}
```

**is not supported in importmap**. This is tracked in https://github.com/WICG/import-maps/issues/232.

# generateImportMapForProject

`generateImportMapForProject` is an async function receiving an array of promise resolving to importmaps. It awaits for every importmap, compose them into one and write it into a file.

> This function is meant to be responsible of generating the final importMap file that a project uses.

<details>
  <summary>generateImportMapForProject code example</summary>

Code below generate an import map from node_modules + a file + an inline importmap.

```js
import {
  getImportMapFromNodeModules,
  getImportMapFromFile,
  generateImportMapForProject,
} from "@jsenv/node-module-import-map"

const projectDirectoryUrl = new URL("./", import.meta.url)
const customImportMapFileUrl = new URL("./import-map-custom.importmap", projectDirectoryUrl)
const importMapInputs = [
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
]

await generateImportMapForProject(importMapInputs, {
  projectDirectoryUrl,
  importMapFileRelativeUrl: "./import-map.importmap",
})
```

— source code at [src/generateImportMapForProject.js](./src/generateImportMapForProject.js)

</details>

## importMapInputs

`importMapInputs` is an array of importmap object or promise resolving to importmap objects. This parameter is optional and is an empty array by default.

> When `importMapInputs` is empty a warning is emitted and `generateImportMapForProject` write an empty importmap file.

## importMapFile

`importMapFile` parameter is a boolean controling if importMap is written to a file. This parameters is optional and enabled by default.

## importMapFileRelativeUrl

`importMapFileRelativeUrl` parameter is a string controlling where importMap file is written. This parameter is optional and by default it's `"./import-map.importmap"`.

# getImportMapFromNodeModules

`getImportMapFromNodeModules` is an async function returning an importMap object computed from the content of node_modules directory. It reads your project `package.json` and recursively try to find your dependencies.

> Be sure node modules are on your filesystem because we'll use the filesystem structure to generate the importmap. For that reason, you must use it after `npm install` or anything that is responsible to generate the node_modules folder and its content on your filesystem.

<details>
  <summary>getImportMapFromNodeModules code example</summary>

```js
import { getImportMapFromNodeModules } from "@jsenv/node-module-import-map"

const importMap = await getImportMapFromNodeModules({
  projectDirectoryUrl: new URL("./", import.meta.url),
  projectPackageDevDependenciesIncluded: true,
})
```

— source code at [src/getImportMapFromNodeModules.js](./src/getImportMapFromNodeModules.js)

</details>

## projectDirectoryUrl

`projectDirectoryUrl` parameter is a string url leading to a folder with a `package.json`. This parameters is **required** and accepted values are documented in https://github.com/jsenv/jsenv-util#assertandnormalizedirectoryurl

## projectPackageDevDependenciesIncluded

`projectPackageDevDependenciesIncluded` parameter is a boolean controling if devDependencies from your project `package.json` are included in the generated importMap. This parameter is optional and by default it's disabled when `process.env.NODE_ENV` is `"production"`.

## packagesExportsPreference

`packagesExportsPreference` parameter is an array of string representing what conditional export you prefer to pick from package.json. This parameter is optional with a default value of `["import", "browser"]`.

It exists to support [conditional exports from Node.js](https://nodejs.org/dist/latest-v13.x/docs/api/esm.html#esm_conditional_exports).

<details>
  <summary>package.json with conditional exports</summary>

```json
{
  "type": "module",
  "main": "dist/commonjs/main.cjs",
  "exports": {
    ".": {
      "require": "./dist/main.cjs",
      "browser": "./main.browser.js",
      "node": "./main.node.js",
      "import": "./main.node.js"
    }
  }
}
```

</details>

When none of `packagesExportsPreference` is found in a `package.json` and if `"default"` is specified in that `package.json`, `"default"` value is read and appears in the importmap.

<details>
  <summary>packagesExportsPreference code example</summary>

Favoring `"browser"` export:

```js
import { getImportMapFromNodeModules } from "@jsenv/node-module-import-map"

const importMap = await getImportMapFromNodeModules({
  projectDirectoryUrl: new URL("./", import.meta.url),
  packagesExportsPreference: ["browser"],
})
```

Favoring `"electron"` and fallback to `"browser"`:

```js
import { getImportMapFromNodeModules } from "@jsenv/node-module-import-map"

const importMap = await getImportMapFromNodeModules({
  projectDirectoryUrl: new URL("./", import.meta.url),
  packagesExportsPreference: ["electron", "browser"],
})
```

</details>

# getImportMapFromFile

`getImportMapFromFile` is an async function reading importmap from a file.

<details>
  <summary>getImportMapFromFile code example</summary>

```js
import { getImportMapFromFile } from "@jsenv/node-module-import-map"

const importMapFileUrl = new URL("./import-map.importmap", import.meta.url)
const importMap = await getImportMapFromFile(importMapFileUrl)
```

— source code at [src/getImportMapFromFile.js](../src/getImportMapFromFile.js)

</details>

## importMapFileUrl

`importMapFileUrl` parameter a string or an url leading to the importmap file. This parameter is **required**.

# Custom node module resolution

`@jsenv/node-module-import-map` uses a custom node module resolution

It behaves as Node.js with one big change:

**A node module will not be found if it is outside your project directory.**

We do this because import map are used on the web where a file outside project directory cannot be reached.

In practice, it has no impact because node modules are inside your project directory. If they are not, ensure all your dependencies are in your `package.json` and re-run `npm install`.

# Concrete example

This part explains how to setup a real environment to see `@jsenv/node-module-import-map` in action.
It reuses a preconfigured project where you can generate import map file.

> You need node 13+ to run this example

<details>
  <summary>Step 1 - Setup basic project</summary>

```console
git clone https://github.com/jsenv/jsenv-node-module-import-map.git
```

```console
cd ./jsenv-node-module-import-map/docs/basic-project
```

```console
npm install
```

</details>

<details>
  <summary>Step 2 - Generate project importMap</summary>

Running command below will log importMap generated for that basic project.

```console
node ./generate-import-map.js
```

</details>
