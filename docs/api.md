# api

`@jsenv/node-module-import-map` exports are documented in this section.

- [generateImportMapForProjectPackage](#generateimportmapforprojectpackage)

## generateImportMapForProjectPackage

```js
const { generateImportMapForProjectPackage } = require("@jsenv/node-module-import-map")

generateImportMapForProjectPackage({
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

### includeDevDependencies option

> When true, devDependencies are included in the generated importMap.

If you don't pass this option, default value is

```js
false
```

### importMapFile option

> When true, importMap will be written to a file.

If you don't pass this option, default value is

```js
false
```

### importMapFileRelativePath option

> Relative path where the importMap file is written.

When written, import map file will be at

<!-- prettier-ignore -->
```js
`${projectPath}${importMapFileRelativePath}`
```

If you don't pass this option, default value is

```js
"/importMap.json"
```

### importMapFileLog option

> When both `importMapFile` and `importMapFileLog` are true, the function will log path to the written importMap file in the terminal.

If you don't pass this option, default value is

```js
true
```
