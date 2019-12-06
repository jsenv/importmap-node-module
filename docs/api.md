# Table of contents for api documentation

- [generateImportMapForProjectPackage](#generateImportMapForProjectPackage)
  - [projectDirectoryUrl](#projectDirectoryUrl)
  - [includeDevDependencies](#includeDevDependencies)
  - [importMapFile](#importMapFile)
  - [importMapFileRelativeUrl](#importMapFileRelativeUrl)
  - [importMapFileLog](#importMapFileLog)

## generateImportMapForProjectPackage

> `generateImportMapForProjectPackage` is an async function returning an importMap object.
> Implemented in [src/generateImportMapForProjectPackage.js](../src/generateImportMapForProjectPackage.js)

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

---

### projectDirectoryUrl

`projectDirectoryUrl` is a **required** parameter, an example value could be:

```js
"file:///Users/you/folder/"
```

It is a string leading to a folder with a package.json.<br />

windows path, like `C:\Users\you\folder` are valid.<br />
file url, like `file:///Users/you/folder`, are valid.<br />

You can use `__dirname` to provide this parameter value.<br />
— see [\_\_dirname documentation on node.js](https://nodejs.org/docs/latest/api/modules.html#modules_dirname).

---

### includeDevDependencies

`includeDevDependencies` is an optional parameter with a default value of

```js
false
```

It is a boolean controling if devDependencies are included in the generated importMap.

---

### importMapFile

`importMapFile` is an optional parameter with a default value of

```js
false
```

It is a boolean controling if importMap is written to a file.

---

### importMapFileRelativeUrl

`importMapFileRelativeUrl` is an optional parameter with a default value of

```js
"./importMap.json"
```

It is a string controlling where importMap file is written.

---

### importMapFileLog

`importMapFileLog` is an optional parameter with a default value of

```js
true
```

It is a boolean controlling if there is log in the terminal when importMap file is written.
