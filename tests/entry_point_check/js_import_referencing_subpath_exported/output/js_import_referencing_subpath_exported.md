1. return promise

2. write file "./input/test.importmap"
```importmap
{
  "imports": {
    "@jsenv/core/conflict": "./root.js",
    "@jsenv/core/rootonly": "./rootonly.js",
    "@jsenv/core/deponly": "./node_modules/@jsenv/core/deponly.js",
    "@jsenv/core": "./index.js"
  },
  "scopes": {
    "./node_modules/@jsenv/core/": {
      "@jsenv/core/conflict": "./node_modules/@jsenv/core/dep.js",
      "@jsenv/core": "./node_modules/@jsenv/core/maindep.js"
    }
  }
}
```

3. resolve
```js
{
  "test.importmap": {
    "imports": {
      "@jsenv/core/conflict": "./root.js",
      "@jsenv/core/rootonly": "./rootonly.js",
      "@jsenv/core/deponly": "./node_modules/@jsenv/core/deponly.js",
      "@jsenv/core": "./index.js"
    },
    "scopes": {
      "./node_modules/@jsenv/core/": {
        "@jsenv/core/conflict": "./node_modules/@jsenv/core/dep.js",
        "@jsenv/core": "./node_modules/@jsenv/core/maindep.js"
      }
    }
  }
}
```