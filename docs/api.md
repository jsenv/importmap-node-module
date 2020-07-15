# Table of contents

- [generateImportMapForProjectPackage](#generateImportMapForProjectPackage)
  - [projectDirectoryUrl](#projectDirectoryUrl)
  - [includeDevDependencies](#includeDevDependencies)
  - [importMapFile](#importMapFile)
  - [importMapFileRelativeUrl](#importMapFileRelativeUrl)
  - [importMapFileLog](#importMapFileLog)
  - [favoredExports](#favoredExports)

## generateImportMapForProjectPackage

> `generateImportMapForProjectPackage` is an async function returning an importMap object.
> Implemented in [src/generateImportMapForProjectPackage.js](../src/generateImportMapForProjectPackage.js)

```js
const { generateImportMapForProjectPackage } = require("@jsenv/node-module-import-map")

const importMap = await generateImportMapForProjectPackage({
  projectDirectoryUrl: __dirname,
  includeDevDependencies: true,
  importMapFile: false,
  importMapFileRelativeUrl: "./import-map.importmap",
  importMapFileLog: true,
})
```

---

### projectDirectoryUrl

> `projectDirectoryUrl` is a string url leading to a folder with a package.json

This parameters is **required**, an example value could be:

```js
"file:///Users/you/directory"
```

Url object, windows path like `C:\\Users\\you\\directory`, linux path like `/Users/you/directory` are also accepted.

You can use `__dirname` to provide this parameter value.<br />
— see [\_\_dirname documentation on node.js](https://nodejs.org/docs/latest/api/modules.html#modules_dirname).

---

### includeDevDependencies

> `includeDevDependencies` is a boolean controling if devDependencies are included in the generated importMap.

This parameter is optional with a default value of

```js
process.env.NODE_ENV !== "production"
```

---

### importMapFile

`importMapFile` is a boolean controling if importMap is written to a file.

This parameters is optional with a default value of

```js
false
```

---

### importMapFileRelativeUrl

> `importMapFileRelativeUrl` is a string controlling where importMap file is written.

This parameter is optional with a default value of

```js
"./import-map.importmap"
```

---

### importMapFileLog

`importMapFileLog` is an optional parameter with a default value of

```js
true
```

It is a boolean controlling if there is log in the terminal when importMap file is written.

---

### favoredExports

> `favoredExports` is an array of string representing what conditional export you prefer to pick from package.json.

This parameters is optional with a default value of

<!-- prettier-ignore -->
```js
[]
```

This parameters exists to support conditional exports from Node.js.<br />
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
