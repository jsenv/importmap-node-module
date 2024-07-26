1. return promise

2. write file "./input/test.importmap"
```importmap
{
  "imports": {
    "foo": "./node_modules/foo/index.mjs"
  },
  "scopes": {
    "./node_modules/foo/": {
      "bar/button.css": "./node_modules/bar/button.css.js"
    }
  }
}
```

3. resolve
```js
{
  "test.importmap": {
    "imports": {
      "foo": "./node_modules/foo/index.mjs"
    },
    "scopes": {
      "./node_modules/foo/": {
        "bar/button.css": "./node_modules/bar/button.css.js"
      }
    }
  }
}
```