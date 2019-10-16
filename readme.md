# jsenv-node-module-import-map

[![github package](https://img.shields.io/github/package-json/v/jsenv/jsenv-node-module-import-map.svg?label=package&logo=github)](https://github.com/jsenv/jsenv-node-module-import-map/packages)
[![workflow status](https://github.com/jsenv/jsenv-node-module-import-map/workflows/continuous%20testing/badge.svg)](https://github.com/jsenv/jsenv-node-module-import-map/actions?workflow=continuous+testing)
[![codecov](https://codecov.io/gh/jsenv/jsenv-node-module-import-map/branch/master/graph/badge.svg)](https://codecov.io/gh/jsenv/jsenv-node-module-import-map)

## Introduction

`@jsenv/node-module-import-map` generates importMap for your project node_modules.<br />
— see [importMap spec](https://github.com/WICG/import-maps)

## Table of contents

- [How it works](#how-it-works)
- [How to use](#how-to-use)
- [Concrete example](#concrete-example)
  - [Step 1 - Copy file structure](#step-1---copy-file-structure)
  - [Step 2 - Install dependencies](#step-2---install-dependencies)
  - [Step 3 - Generate importMap](#step-3---generate-importMap)
- [Custom node module resolution](#custom-node-module-resolution)
- [Installation](#installation-using-npm)

## How it works

Reads `package.json` and recursively try to find your dependencies.<br />

Be sure node modules are on your filesystem because we'll use the filesystem structure to generate the importMap. For that reason, you must use it after `npm install` or anything that is responsible to generate the node_modules folder and its content on your filesystem.<br />

## How to use

Here is code example using `@jsenv/node-module-import-map` to create an `importMap.json`.

```js
const { generateImportMapForProjectPackage } = require("@jsenv/node-module-import-map")

generateImportMapForProjectPackage({
  projectPath: __dirname,
  includeDevDependencies: true,
  importMapFile: true,
  importMapFileRelativePath: "/importMap.json",
})
```

For more information check the [api documentation](./docs/api.md).

## Concrete example

This part explains how to try `@jsenv/node-module-import-map` on a basic project.<br />
It helps to setup a real environment to see it in action.

### Step 1 - Copy file structure

Reproduce the basic project file structure at [./docs/basic-project](./docs/basic-project)

### Step 2 - Install dependencies

If you never configured npm authentification on github registry see [Configure npm authentification on github registry](https://github.com/jsenv/jsenv-core/blob/master/docs/installing-jsenv-package.md#configure-npm-authentification-on-github-registry) first.

```console
npm install
```

### Step 3 - Generate importMap

```console
node ./generate-import-map.js
```

`basic-project/importMap.json` file will be created.

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

## Installation

If you never installed a jsenv package, read [Installing a jsenv package](https://github.com/jsenv/jsenv-core/blob/master/docs/installing-jsenv-package.md#installing-a-jsenv-package) before going further.

This documentation is up-to-date with a specific version so prefer any of the following commands

```console
npm install --save-dev @jsenv/node-module-import-map@7.3.0
```

```console
yarn add --dev @jsenv/node-module-import-map@7.3.0
```
