# jsenv-node-module-import-map

[![npm package](https://img.shields.io/npm/v/@jsenv/node-module-import-map.svg)](https://www.npmjs.com/package/@jsenv/node-module-import-map)
[![build](https://travis-ci.com/jsenv/jsenv-node-module-import-map.svg?branch=master)](http://travis-ci.com/jsenv/jsenv-node-module-import-map)
[![codecov](https://codecov.io/gh/jsenv/jsenv-node-module-import-map/branch/master/graph/badge.svg)](https://codecov.io/gh/jsenv/jsenv-node-module-import-map)

> convert node_modules into importMap

## Introduction

`jsenv-node-module-import-map` can generate an importMap object from a `package.json` file.<br />

## Table of contents

- [How it works](#how-it-works)
- [How to use](#how-to-use)
  - [Example on basic project](#example-on-basic-project)
- [API](#api)
- [Custom node module resolution](#custom-node-module-resolution)
- [Installation](#installation)

## How it works

Reads `package.json` and recursively try to find your dependencies.<br />

It must happen once node modules are on your machine, because it searches dependencies on your filesystem. For that reason, you must use it after `npm install` or anything that is responsible to download node modules to put them on your machine.<br />

## How to use

To understand how to use this repository let's use it on a "real" project.<br />
We will setup a basic project and generate an importMap.json file for it.

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

## What is an importMap ?

https://github.com/WICG/import-maps

## Custom node module resolution

This project uses a custom node module resolution.<br />
— see [node module resolution on node.js](https://nodejs.org/api/modules.html#modules_all_together)

It behaves as Node.js with one big change:

> A node module will not be found if it is outside your project folder.

We do this because importMap are used on the web.<br/>
A web server hide its internal file structure for obvious security reasons. Consequently browsers cannot get a file outside a server origin.

An other way to realize this is to see what it means exactly for a browser. If you had a project at `/Users/you/project` served at `https://example.com`, trying to find a file at `/Users/you/node_modules/whatever/index.js` means doing this:

```js
new URL("../node_modules/whatever/index.js", "https://example.com/file.js")
```

Your server would send<br />
`/Users/you/project/node_modules/whatever/index.js`<br />
instead of<br />
`/Users/you/node_modules/whatever/index.js`

## Installation

```console
npm install --save-dev @jsenv/node-module-import-map@6.0.0
```

```console
yarn add @jsenv/node-module-import-map@6.0.0 --dev
```
