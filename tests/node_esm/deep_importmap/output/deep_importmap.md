1. return promise

2. write file "./input/src/directory/test.importmap"
```importmap
{
  "imports": {
    "directory/": "./",
    "example": "../../node_modules/example/index.js"
  },
  "scopes": {
    "../../node_modules/example/": {
      "../../node_modules/example/file": "../../node_modules/example/file.js"
    }
  }
}
```

3. resolve
```js
{
  "./src/directory/test.importmap": {
    "imports": {
      "directory/": "./",
      "example": "../../node_modules/example/index.js"
    },
    "scopes": {
      "../../node_modules/example/": {
        "../../node_modules/example/file": "../../node_modules/example/file.js"
      }
    }
  }
}
```