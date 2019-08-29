# api

`@jsenv/node-module-import-map` has the following exports:

- `generateImportMapForNodeModules`

## `generateImportMapForNodeModules`

```js
const { generateImportMapForNodeModules } = require("@jsenv/node-module-import-map")

generateImportMapForNodeModules({
  projectPath: __dirname,
})
```

An async function returning an importMap object.<br />
It accepts several options documented below. Each option can be passed like `projectPath` is passed in the code above.

### projectPath option

> Path leading to a folder with a package.json.

```js
const projectPath = "/Users/you/folder"
```

- This option is **required**.
- On windows you would pass `C:\Users\you\folder`, that's fine.
- You can use `__dirname` to provide this option value.<br />
  — see [\_\_dirname documentation on node.js](https://nodejs.org/docs/latest/api/modules.html#modules_dirname)

### writeImportMapFile option

> When true, importMap will be written to a file.

If you don't pass this option, default value is

```js
false
```

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

### logImportMapFilePath option

> When both `writeImportMapFile` and `logImportMapFilePath` are true, the function will log path to the written importMap file in the terminal.

If you don't pass this option, default value is

```js
true
```
