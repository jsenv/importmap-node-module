# jsenv-node-module-import-map

[![github package](https://img.shields.io/github/package-json/v/jsenv/jsenv-node-module-import-map.svg?label=package&logo=github)](https://github.com/jsenv/jsenv-node-module-import-map/packages)
[![ci status](https://github.com/jsenv/jsenv-node-module-import-map/workflows/ci/badge.svg)](https://github.com/jsenv/jsenv-node-module-import-map/actions)
[![codecov](https://codecov.io/gh/jsenv/jsenv-node-module-import-map/branch/master/graph/badge.svg)](https://codecov.io/gh/jsenv/jsenv-node-module-import-map)

## Introduction

`@jsenv/node-module-import-map` generates importMap for your project node_modules.<br />
— see [importMap spec](https://github.com/WICG/import-maps)

## Table of contents

- [How it works](#how-it-works)
- [How to use](#how-to-use)
- [Concrete example](#concrete-example)
- [Custom node module resolution](#custom-node-module-resolution)
- [Installation using npm](#installation-using-npm)
- [Installation using yarn](#installation-using-yarn)

## How it works

Reads `package.json` and recursively try to find your dependencies.<br />

Be sure node modules are on your filesystem because we'll use the filesystem structure to generate the importMap. For that reason, you must use it after `npm install` or anything that is responsible to generate the node_modules folder and its content on your filesystem.<br />

### How to use

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

For more information check the api documentation.<br />
— see [./docs/api](./docs/api.md)

## Concrete example

This part explains how to try `@jsenv/node-module-import-map` on a basic project.<br />
It helps to setup a real environment to see it in action.

1. Create basic project file structure

   — see [./docs/basic-project](./docs/basic-project)

2. Configure npm authentification

   — see [documentation about npm authentification on github registry](https://github.com/jsenv/jsenv-core/blob/master/docs/npm-auth-github-registry.md##npm-authentification-on-github-registry)

3. Install dependencies

   ```console
   npm install
   ```

4. Generate `basic-project/importMap.json`

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

## Installation using npm

`@jsenv/node-module-import-map` is published on github package registry.<br />
You need to configure npm to use github registry for this package.

1. Configure npm authentification

— see [documentation about npm authentification on github registry](https://github.com/jsenv/jsenv-core/blob/master/docs/npm-auth-github-registry.md##npm-authentification-on-github-registry)

2. Configure npm registry

Add the following line to your `.npmrc`

```
@jsenv:registry=https://npm.pkg.github.com
```

Or run the following command

```console
npm config set @jsenv:registry https://npm.pkg.github.com
```

3. Run npm install command

```console
npm install @jsenv/node-module-import-map@7.2.2
```

### Installation using yarn

Same steps as [Installation using npm](#installation-using-npm) replacing step 3 by

```console
yarn add @jsenv/node-module-import-map@7.2.2
```
