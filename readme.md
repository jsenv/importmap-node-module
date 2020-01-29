# node-module-import-map

Generate importmap for node_modules.

[![github package](https://img.shields.io/github/package-json/v/jsenv/jsenv-node-module-import-map.svg?logo=github&label=package)](https://github.com/jsenv/jsenv-node-module-import-map/packages)
[![npm package](https://img.shields.io/npm/v/@jsenv/node-module-import-map.svg?logo=npm&label=package)](https://www.npmjs.com/package/@jsenv/node-module-import-map)
[![github ci](https://github.com/jsenv/jsenv-node-module-import-map/workflows/ci/badge.svg)](https://github.com/jsenv/jsenv-node-module-import-map/actions?workflow=ci)
[![codecov coverage](https://codecov.io/gh/jsenv/jsenv-node-module-import-map/branch/master/graph/badge.svg)](https://codecov.io/gh/jsenv/jsenv-node-module-import-map)

# Table of contents

- [Presentation](#Presentation)
- [Installation](#installation)
  - [Concrete example](#concrete-example)
    - [Step 1 - Setup basic project](#step-1---setup-project)
    - [Step 2 - Generate project importMap](#step-2---generate-project-importMap)
- [Documentation](#Documentation)
  - [Custom node module resolution](#custom-node-module-resolution)
  - [generateImportMapForProjectPackage](#generateImportMapForProjectPackage)
    - [projectDirectoryUrl](#projectDirectoryUrl)
    - [includeDevDependencies](#includeDevDependencies)
    - [importMapFile](#importMapFile)
    - [importMapFileRelativeUrl](#importMapFileRelativeUrl)
    - [importMapFileLog](#importMapFileLog)
    - [favoredExports](#favoredExports)

# Presentation

`@jsenv/node-module-import-map` generates importMap for your project node_modules.<br />
— see [importMap spec](https://github.com/WICG/import-maps)

It reads `package.json` and recursively try to find your dependencies. Be sure node modules are on your filesystem because we'll use the filesystem structure to generate the importMap. For that reason, you must use it after `npm install` or anything that is responsible to generate the node_modules folder and its content on your filesystem.

```js
import { generateImportMapForProjectPackage } from "@jsenv/node-module-import-map"

generateImportMapForProjectPackage({
  projectDirectoryUrl: "file:///directory",
  includeDevDependencies: true,
  importMapFile: true,
  importMapFileRelativeUrl: "./importMap.json",
})
```

`@jsenv/node-module-import-map` can also be required.

```js
const { generateImportMapForProjectPackage } = require("@jsenv/node-module-import-map")
```

# Installation

```console
npm install --save-dev @jsenv/node-module-import-map@11.0.0
```

## Concrete example

This part explains how to setup a real environment to see `@jsenv/node-module-import-map` in action.
It reuses a preconfigured project where you can generate import map file.

### Step 1 - Setup basic project

```console
git clone https://github.com/jsenv/jsenv-node-module-import-map.git
```

```console
cd ./jsenv-node-module-import-map/docs/basic-project
```

```console
npm install
```

### Step 2 - Generate project importMap

Running command below will generate import map file at `docs/basic-project/importMap.json`.

```console
node ./generate-import-map.js
```

# Documentation

## Custom node module resolution

`@jsenv/node-module-import-map` uses a custom node module resolution.<br />
— see [node module resolution on node.js](https://nodejs.org/api/modules.html#modules_all_together)

It behaves as Node.js with one big change:

> A node module will not be found if it is outside your project folder.

We do this because importMap are used on the web where a file outside project folder would fail.<br/>

And here is why:

You have a server at `https://example.com` serving files inside `/Users/you/project`.<br />
Your project uses a file outside of your project folder like `/Users/you/node_modules/whatever/index.js`.

From a filesystem perspective we could find file using `../node_modules/whatever/index.js`.<br />
For a web client however `../node_modules/whatever/index.js` resolves to `https://example.com/node_modules/whatever/index.js`. Server would be requested at that url searching for `/Users/you/project/node_modules/whatever/index.js` instead of `/Users/you/node_modules/whatever/index.js`.

In practice it does not impact you because node modules are inside your project folder. If not, explicitely write your dependencies in your `package.json` and run `npm install`.

## generateImportMapForProjectPackage

`generateImportMapForProjectPackage` is an async function returning an importMap object.

```js
const { generateImportMapForProjectPackage } = require("@jsenv/node-module-import-map")

const importMap = await generateImportMapForProjectPackage({
  projectDirectoryUrl: __dirname,
  includeDevDependencies: true,
  importMapFile: false,
  importMapFileRelativeUrl: "./importMap.json",
  importMapFileLog: true,
})
```

— source code at [src/generateImportMapForProjectPackage.js](./src/generateImportMapForProjectPackage.js).

### projectDirectoryUrl

`projectDirectoryUrl` parameter is a string url leading to a folder with a package.json. This parameters is **required** and accepted values are documented in https://github.com/jsenv/jsenv-util#assertAndNormalizeDirectoryUrl

### includeDevDependencies

`includeDevDependencies` parameter is a boolean controling if devDependencies are included in the generated importMap. This parameter is optional with a default value of `process.env.NODE_ENV !== "production"`.

### importMapFile

`importMapFile` parameter is a boolean controling if importMap is written to a file. This parameters is optional with a default value of `false`.

### importMapFileRelativeUrl

`importMapFileRelativeUrl` parameter is a string controlling where importMap file is written. This parameter is optional with a default value of `"./importMap.json"`.

### importMapFileLog

`importMapFileLog` parameter a boolean controlling if there is log in the terminal when importMap file is written. It is optional with a default value of `true`.

### favoredExports

`favoredExports` parameter is an array of string representing what conditional export you prefer to pick from package.json. This parameters is optional with a default value of `["import", "node", "require"]`.

This parameters exists to support conditional exports from Node.js.

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

When `favoredExports` is empty or none of favored export matches in a package.json and if there is a `"default"` conditional export specified in the package.json it is used and appears in the generated importmap.
