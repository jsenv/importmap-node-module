# jsenv-node-module-import-map

> convert node_modules into importMap

[![npm package](https://img.shields.io/npm/v/@jsenv/node-module-import-map.svg)](https://www.npmjs.com/package/@jsenv/node-module-import-map)
[![build](https://travis-ci.com/jsenv/jsenv-node-module-import-map.svg?branch=master)](http://travis-ci.com/jsenv/jsenv-node-module-import-map)
[![codecov](https://codecov.io/gh/jsenv/jsenv-node-module-import-map/branch/master/graph/badge.svg)](https://codecov.io/gh/jsenv/jsenv-node-module-import-map)

## Introduction

`@jsenv/node-module-import-map` can generate an importMap object for your project node_modules folder.<br />
— see [importMap spec](https://github.com/WICG/import-maps)

## Table of contents

- [How it works](#how-it-works)
- [How to use](#how-to-use)
  - [Example on basic project](#example-on-basic-project)
- [API](#api)
- [Custom node module resolution](#custom-node-module-resolution)
- [Installation](#installation)

## How it works

Reads `package.json` and recursively try to find your dependencies.<br />

Be sure node modules are on your filesystem because we'll use the filesystem structure to generate the importMap. For that reason, you must use it after `npm install` or anything that is responsible to generate the node_modules folder and its content on your filesystem.<br />

## How to use

To understand how to use `@jsenv/node-module-import-map` let's setup a basic project and generate an importMap.json.

### Example on basic project

1. Create basic project file structure

   — see [./docs/basic-project](./docs/basic-project)

2. Install dependencies

   ```console
   npm install
   ```

3. Generate `basic-project/importMap.json`

   ```console
   node ./generate-import-map.js
   ```

   `basic-project/importMap.json` file will be created.

## API

— see [./docs/api](./docs/api.md)

## Custom node module resolution

This project uses a custom node module resolution.<br />
— see [node module resolution on node.js](https://nodejs.org/api/modules.html#modules_all_together)

It behaves as Node.js with one big change:

> A node module will not be found if it is outside your project folder.

We do this because importMap are used on the web where a file outside project folder would fail.<br/>

And here is why:

You have a server at `https://example.com` serving files inside `/Users/you/project`.<br />
Your project uses a file outside of your project folder like `/Users/you/node_modules/whatever/index.js`.

From a filesystem perspective we could find file using `../node_modules/whatever/index.js`.<br />
For a web client however `../node_modules/whatever/index.js` resolves to `https://example.com/node_modules/whatever/index.js`. Server would be requested at that url searching for `/Users/you/project/node_modules/whatever/index.js` instead of `/Users/you/node_modules/whatever/index.js`

## Installation

```console
npm install --save-dev @jsenv/node-module-import-map@7.0.0
```

```console
yarn add @jsenv/node-module-import-map@7.0.0 --dev
```
