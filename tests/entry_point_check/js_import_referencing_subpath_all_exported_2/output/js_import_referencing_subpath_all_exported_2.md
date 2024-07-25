1. return promise

2. write file "input/test.importmap"
```importmap
{
  "imports": {
    "@jsenv/core/": "./",
    "@jsenv/core": "./index"
  },
  "scopes": {
    "./node_modules/@jsenv/core/": {
      "@jsenv/core/": "./node_modules/@jsenv/core/",
      "@jsenv/core": "./node_modules/@jsenv/core/index"
    }
  }
}
```

3. resolve
```js
{
  "test.importmap": {
    "imports": {
      "@jsenv/core/": "./",
      "@jsenv/core": "./index"
    },
    "scopes": {
      "./node_modules/@jsenv/core/": {
        "@jsenv/core/": "./node_modules/@jsenv/core/",
        "@jsenv/core": "./node_modules/@jsenv/core/index"
      }
    }
  }
}
```