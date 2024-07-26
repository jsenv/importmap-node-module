1. return promise

2. write file "./input/test.importmap"
```importmap
{
  "imports": {
    "root/": "./",
    "foo/": "./node_modules/foo/",
    "root": "./index.js",
    "foo": "./node_modules/foo/index.js"
  },
  "scopes": {}
}
```

3. resolve
```js
{
  "test.importmap": {
    "imports": {
      "root/": "./",
      "foo/": "./node_modules/foo/",
      "root": "./index.js",
      "foo": "./node_modules/foo/index.js"
    },
    "scopes": {}
  }
}
```