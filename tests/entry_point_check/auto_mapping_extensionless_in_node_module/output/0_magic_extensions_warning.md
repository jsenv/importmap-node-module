1. return promise

2. console.warn
```console

Import resolution failed for "./file"
--- import trace ---
base/input/node_modules/leftpad/index.js:1:7
> 1 | import "./file"
    |       ^
--- reason ---
file not found on filesystem at base/input/node_modules/leftpad/file
--- suggestion 1 ---
update import specifier to "./file.js"
--- suggestion 2 ---
use magicExtensions: ["inherit"]
--- suggestion 3 ---
add mapping to "manualImportmap"
{
  "scopes": {
    "./node_modules/leftpad/": {
      "./node_modules/leftpad/file": "./node_modules/leftpad/file.js"
    }
  }
}

```

3. write file "./input/test.importmap"
```importmap
{
  "imports": {
    "leftpad": "./node_modules/leftpad/index.js"
  },
  "scopes": {}
}
```

4. resolve
```js
{
  "test.importmap": {
    "imports": {
      "leftpad": "./node_modules/leftpad/index.js"
    },
    "scopes": {}
  }
}
```