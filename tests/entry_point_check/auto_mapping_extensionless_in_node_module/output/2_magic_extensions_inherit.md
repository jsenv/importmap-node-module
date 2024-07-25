1. return promise

2. write file "input/test.importmap"
```importmap
{
  "imports": {
    "leftpad": "./node_modules/leftpad/index.js"
  },
  "scopes": {
    "./node_modules/leftpad/": {
      "./node_modules/leftpad/other-file": "./node_modules/leftpad/other-file.ts",
      "./node_modules/leftpad/file": "./node_modules/leftpad/file.js"
    }
  }
}
```

3. resolve
```js
{
  "test.importmap": {
    "imports": {
      "leftpad": "./node_modules/leftpad/index.js"
    },
    "scopes": {
      "./node_modules/leftpad/": {
        "./node_modules/leftpad/other-file": "./node_modules/leftpad/other-file.ts",
        "./node_modules/leftpad/file": "./node_modules/leftpad/file.js"
      }
    }
  }
}
```