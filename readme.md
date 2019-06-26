# jsenv-node-module-import-map

[![npm package](https://img.shields.io/npm/v/@jsenv/node-module-import-map.svg)](https://www.npmjs.com/package/@jsenv/node-module-import-map)
[![build](https://travis-ci.com/jsenv/jsenv-node-module-import-map.svg?branch=master)](http://travis-ci.com/jsenv/jsenv-node-module-import-map)
[![codecov](https://codecov.io/gh/jsenv/jsenv-node-module-import-map/branch/master/graph/badge.svg)](https://codecov.io/gh/jsenv/jsenv-node-module-import-map)

> convert node_modules into importMap

## Introduction

`jsenv-node-module-import-map` can generate an importMap object from a `package.json` file.<br />

importMap can be used by other tools to know where to find an import like

```js
import whatever from "lodash"
```

without having to use node module resolution.<br />
— see [node module resolution on node.js](https://nodejs.org/api/modules.html#modules_all_together)

## How it works

Reads `package.json` and recursively try to find your dependencies.<br />

It must happen once node modules are on your machine, because it searches dependencies on your filesystem. For that reason, you must use it after `npm install` or anything that is responsible to download node modules to put them on your machine.<br />

## How to use

This section assumes you have a folder with a `package.json` file and you want to generate the corresponding importMap.<br />
This example assumes folder path is `/Users/dmail`. Don't forget to replace it by the actual path on your machine.

1. go to `/Users/dmail/folder/`

```shell
cd /Users/dmail/folder/
```

2. install `@jsenv/node-module-import-map`

```shell
npm install --save-dev @jsenv/node-module-import-map
```

2. create `generate-import-map.js`

```js
const { generateImportMapForProjectNodeModules } = require("@jsenv/node-module-import-map")

generateImportMapForProjectNodeModules({ projectPath: __dirname })
```

3. execute `generate-import-map.js`

```shell
node generate-import-map.js
```

`importMap.json` file will be created in your folder.<br />

## Implementation details

##### Scope keys surrounded with `/`

```json
{
  "scopes": {
    "/node_modules/pkg/": {
      "lib": "/node_modules/lib/index.js"
    }
  }
}
```

Could also be written

```json
{
  "scopes": {
    "node_modules/pkg": {
      "lib": "/node_modules/lib/index.js"
    }
  }
}
```

But it's important to use `/node_modules/pkg/` because only one url pathname can match it while `node_modules/pkg` is too permissive.<br />
For instance `http://domain.com/foo/node_modules/pkg` or `http://domain.com/node_modules/pkg2` would match `node_modules/pkg` which is certainly not what you want.

##### Imports values starts with `/`

```json
{
  "scopes": {
    "/node_modules/pkg/": {
      "lib": "/node_modules/lib/index.js"
    }
  }
}
```

Could be written

```json
{
  "scopes": {
    "/node_modules/pkg/": {
      "lib": "../lib/index.js"
    }
  }
}
```

But `"/node_modules/lib/index.js"` is easier to read than `"../lib/index.js"` for a human or a machine.<br/>
Most importantly relative notation can contains enough `../` to remap an import outside your project root.<br />

Inside a browser, it would fail to find the file.<br />
Inside node.js your having a dependency to a file outside your project root folder, it can and must be avoided.

## `generateImportMapForProjectNodeModules`

An async function returning an importMap object.

```js
const importMap = await generateImportMapForProjectNodeModules({
  projectPath: __dirname,
  writeImportMapFile: false,
})
```

It accepts several options documented below. Each option can be passed like writeImportMapFile is passed in the code above.

### projectPath option

> Path leading to a folder with a package.json.

```js
const projectPath = "/Users/dmail/folder"
```

- This option is **required**.
- On windows you would pass `C:\Users\dmail\folder`, that's fine.
- You can use `__dirname` to provide this option value.<br />
  — see [\_\_dirname documentation on node.js](https://nodejs.org/docs/latest/api/modules.html#modules_dirname)

### importMapRelativePath option

> Relative path where the importMap file is written.

When written, import map file will be at

<!-- prettier-ignore -->
```js
`${projectPath}${importMapRelativePath}`
```

If you don't pass this option, default value is

```js
"/importMap.json"
```

### writeImportMapFile option

> When true, importMap will be written to a file.

If you don't pass this option, default value is

```js
true
```

### logImportMapFilePath option

> When both `writeImportMapFile` and `logImportMapFilePath` are true, the function will log path to the written importMap file in the terminal.

If you don't pass this option, default value is

```js
true
```
