# node-module-import-map

Generate importmap for node_modules.

[![github package](https://img.shields.io/github/package-json/v/jsenv/jsenv-node-module-import-map.svg?logo=github&label=package)](https://github.com/jsenv/jsenv-node-module-import-map/packages)
[![npm package](https://img.shields.io/npm/v/@jsenv/node-module-import-map.svg?logo=npm&label=package)](https://www.npmjs.com/package/@jsenv/node-module-import-map)
[![github ci](https://github.com/jsenv/jsenv-node-module-import-map/workflows/ci/badge.svg)](https://github.com/jsenv/jsenv-node-module-import-map/actions?workflow=ci)
[![codecov coverage](https://codecov.io/gh/jsenv/jsenv-node-module-import-map/branch/master/graph/badge.svg)](https://codecov.io/gh/jsenv/jsenv-node-module-import-map)

# Table of contents

- [Presentation](#Presentation)
- [Installation](#installation)
- [computeImportMapForNodeModules](#computeImportMapForNodeModules)
  - [projectDirectoryUrl](#projectDirectoryUrl)
  - [projectPackageDevDependenciesIncluded](#projectPackageDevDependenciesIncluded)
  - [packagesExportsPreference](#packagesExportsPreference)
- [generateImportMapForProject](#generateImportMapForProject)
  - [shared parameters](#shared-parameters)
  - [customImportMapFileIncluded](#customImportMapFileIncluded)
  - [customImportMapFileRelativeUrl](#customImportMapFileRelativeUrl)
  - [importMapFile](#importMapFile)
  - [importMapFileRelativeUrl](#importMapFileRelativeUrl)
  - [importMapFileLog](#importMapFileLog)
- [Concrete example](#concrete-example)
  - [Step 1 - Setup basic project](#step-1---setup-project)
  - [Step 2 - Generate project importMap](#step-2---generate-project-importMap)
- [Custom node module resolution](#custom-node-module-resolution)

# Presentation

`@jsenv/node-module-import-map` generates importMap for your project node_modules.<br />
— see [importMap spec](https://github.com/WICG/import-maps)

It reads `package.json` and recursively try to find your dependencies. Be sure node modules are on your filesystem because we'll use the filesystem structure to generate the importmap. For that reason, you must use it after `npm install` or anything that is responsible to generate the node_modules folder and its content on your filesystem.

```js
import { computeImportMapForNodeModules } from "@jsenv/node-module-import-map"

computeImportMapForNodeModules({
  projectDirectoryUrl: "file:///directory",
  projectPackageDevDependenciesIncluded: true,
})
```

`@jsenv/node-module-import-map` can also be required.

```js
const { generateImportMapForProject } = require("@jsenv/node-module-import-map")
```

# Installation

```console
npm install @jsenv/node-module-import-map
```

# computeImportMapForNodeModules

`computeImportMapForNodeModules` is an async function returning an importMap object computed from the content of node_modules directory.

```js
import { computeImportMapForNodeModules } from "@jsenv/node-module-import-map"

const importMap = await computeImportMapForNodeModules({
  projectDirectoryUrl: new URL("./", import.meta.url),
  projectPackageDevDependenciesIncluded: true,
})
```

— source code at [src/computeImportMapForNodeModules.js](./src/computeImportMapForNodeModules.js).

## projectDirectoryUrl

`projectDirectoryUrl` parameter is a string url leading to a folder with a `package.json`. This parameters is **required** and accepted values are documented in https://github.com/jsenv/jsenv-util#assertAndNormalizeDirectoryUrl

## projectPackageDevDependenciesIncluded

`projectPackageDevDependenciesIncluded` parameter is a boolean controling if devDependencies from your project `package.json` are included in the generated importMap. This parameter is optional and by default it's disabled when `process.env.NODE_ENV` is `"production"`.

## packagesExportsPreference

`packagesExportsPreference` parameter is an array of string representing what conditional export you prefer to pick from package.json. This parameter is optional with a default value of `["import", "node", "require"]`. It exists to support conditional exports from Node.js.

— see [Conditional export documentation on Node.js](https://nodejs.org/dist/latest-v13.x/docs/api/esm.html#esm_conditional_exports)

For instance if you want to favor `"browser"` conditional export use the following value.

<!-- prettier-ignore -->
```js
["browser"]
```

Or if you prefer `"electron"` and fallback to `"browser"` use the following value.

<!-- prettier-ignore -->
```js
["electron", "browser"]
```

When none of `packagesExportsPreference` is found in a `package.json` and if `"default"` is specified in that `package.json`, `"default"` value is read and appears in the importmap.

# generateImportMapForProject

`generateImportMapForProject` is an async function generating an importMap from node_modules and an optional custom file and writing the resulting importMap file in your project.

> This function is meant to be responsible of generating an importMap that a project relying on Node.js will use.

```js
import { computeImportMapForNodeModules } from "@jsenv/node-module-import-map"

const importMap = await computeImportMapForNodeModules({
  projectDirectoryUrl: new URL("./", import.meta.url),
  projectPackageDevDependenciesIncluded: true,
})
```

## importMapFile

`importMapFile` parameter is a boolean controling if importMap is written to a file. This parameters is optional and enabled by default.

## importMapFileRelativeUrl

`importMapFileRelativeUrl` parameter is a string controlling where importMap file is written. This parameter is optional and by default it's `"./import-map.importmap"`.

## importMapFileLog

`importMapFileLog` parameter a boolean controlling if there is log in the terminal when importMap file is written. This parameter is optional and by default it's enabled.

## customImportMapFileIncluded

`customImportMapFileIncluded` parameter is a boolean controlling if a custom import map file will be read and appear in the generated import-map. This parameter is optional and disabled by default.

> When a file

## customImportMapFileRelativeUrl

`customImportMapFileRelativeUrl` parameter is a string controlling the location of the custom importmap file. This parameter is optional and it's default value is `"./import-map-custom.importmap"`.

> Note that remapping inside this file takes precedence over import generated for node_modules.

# Concrete example

This part explains how to setup a real environment to see `@jsenv/node-module-import-map` in action.
It reuses a preconfigured project where you can generate import map file.

## Step 1 - Setup basic project

```console
git clone https://github.com/jsenv/jsenv-node-module-import-map.git
```

```console
cd ./jsenv-node-module-import-map/docs/basic-project
```

```console
npm install
```

## Step 2 - Generate project importMap

Running command below will generate import map file at `docs/basic-project/import-map.importmap`.

```console
node ./generate-import-map.js
```

# Custom node module resolution

`@jsenv/node-module-import-map` uses a custom node module resolution.<br />
— see [node module resolution on node.js](https://nodejs.org/api/modules.html#modules_all_together)

It behaves as Node.js with one big change:

> A node module will not be found if it is outside your project folder.

We do this because importMap are used on the web where a file outside project folder would cannot be reached.

In practice it does not impact you because node modules are inside your project folder. If not, write all your dependencies in your `package.json` and re-run `npm install`.
