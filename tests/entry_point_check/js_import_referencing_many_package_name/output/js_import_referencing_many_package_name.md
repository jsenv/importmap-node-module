1. return promise

2. write file "./input/test.importmap"
```importmap
{
  "imports": {
    "root/boo": "./lib/boo.js",
    "foo/bar": "./node_modules/foo/src/bar.js",
    "root/": "./",
    "foo/": "./node_modules/foo/",
    "root": "./index.js",
    "foo": "./node_modules/foo/index"
  },
  "scopes": {}
}
```

3. resolve
```js
{
  "test.importmap": {
    "imports": {
      "root/boo": "./lib/boo.js",
      "foo/bar": "./node_modules/foo/src/bar.js",
      "root/": "./",
      "foo/": "./node_modules/foo/",
      "root": "./index.js",
      "foo": "./node_modules/foo/index"
    },
    "scopes": {}
  }
}
```