1. return promise

2. console.warn
```console

Import resolution failed for "./other-file"
--- import trace ---
file:///<root>/input/node_modules/leftpad/file.js:1:7
> 1 | import "./other-file"
    |       ^
--- reason ---
file not found on filesystem at <root>/input/node_modules/leftpad/other-file

```

3. write file "input/test.importmap"
```importmap
{
  "imports": {
    "leftpad": "./node_modules/leftpad/index.js"
  },
  "scopes": {
    "./node_modules/leftpad/": {
      "./node_modules/leftpad/file": "./node_modules/leftpad/file.js"
    }
  }
}
```

4. resolve
```js
{
  "test.importmap": {
    "imports": {
      "leftpad": "./node_modules/leftpad/index.js"
    },
    "scopes": {
      "./node_modules/leftpad/": {
        "./node_modules/leftpad/file": "./node_modules/leftpad/file.js"
      }
    }
  }
}
```