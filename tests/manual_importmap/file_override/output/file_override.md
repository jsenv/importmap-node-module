1. return promise

2. write file "./input/test.importmap"
```importmap
{
  "imports": {
    "./node_modules/foo/button.css": "./node_modules/foo/button.css.js",
    "root/": "./",
    "foo/": "./node_modules/foo/",
    "root": "./index",
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
      "./node_modules/foo/button.css": "./node_modules/foo/button.css.js",
      "root/": "./",
      "foo/": "./node_modules/foo/",
      "root": "./index",
      "foo": "./node_modules/foo/index"
    },
    "scopes": {}
  }
}
```