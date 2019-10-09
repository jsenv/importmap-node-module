# Table of contents for api documentation

- [generateImportMapForProjectPackage](#generateImportMapForProjectPackage)
  - [projectPath](#projectPath)
  - [importMapFile](#importMapFile)
  - [importMapFileRelativePath](#importMapFileRelativePath)
  - [importMapFileLog](#importMapFileLog)
  - [includeDevDependencies](#includeDevDependencies)

## generateImportMapForProjectPackage

```js
const { generateImportMapForProjectPackage } = require("@jsenv/node-module-import-map")

generateImportMapForProjectPackage({
  projectPath: __dirname,
})
```

— see [source code on github](../src/generateImportMapForProjectPackage/generateImportMapForProjectPackage.js).

It is an async function returning an importMap object.

---

### projectPath

> `projectPath` is a string leading to a folder with a package.json.<br />

This parameter is **required**, an example value could be:

```js
"/Users/you/folder"
```

On windows you would pass `C:\Users\you\folder`, that's fine.<br />
You can use `__dirname` to provide this parameter value.<br />
— see [\_\_dirname documentation on node.js](https://nodejs.org/docs/latest/api/modules.html#modules_dirname)

---

### includeDevDependencies

> `includeDevDependencies` controls if devDependencies are included in the generated importMap.

This parameter is optional, the default value is:

```js
false
```

---

### importMapFile

> `importMapFile` controls if importMap will be written to a file.

This parameter is optional, the default value is:

```js
false
```

---

### importMapFileRelativePath

> `importMapFileRelativePath` is a string controlling where importMap file is written.

This parameter is optional, the default value is:

```js
"/importMap.json"
```

It means if `importMapFile` is true importMap file is written at

<!-- prettier-ignore -->
```js
`${projectPath}${importMapFileRelativePath}`
```

---

### importMapFileLog

> `importMapFileLog` controls if there is log in the termminal when writing importMap file.

This parameter is optional, the default value is:

```js
true
```
