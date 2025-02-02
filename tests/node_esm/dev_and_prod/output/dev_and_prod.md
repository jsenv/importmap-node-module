1. return promise

2. write file "./input/dev.importmap"

```importmap
{
  "imports": {
    "root/": "./",
    "bar/": "./node_modules/bar/",
    "foo/": "./node_modules/foo/",
    "root": "./index",
    "bar": "./node_modules/bar/bar.js",
    "foo": "./node_modules/foo/foo.js"
  },
  "scopes": {}
}
```

3. write file "./input/prod.importmap"

```importmap
{
  "imports": {
    "root/": "./",
    "foo/": "./node_modules/foo/",
    "root": "./index",
    "foo": "./node_modules/foo/foo.js"
  },
  "scopes": {}
}
```

4. resolve

```js
{
  "dev.importmap": {
    "imports": {
      "root/": "./",
      "bar/": "./node_modules/bar/",
      "foo/": "./node_modules/foo/",
      "root": "./index",
      "bar": "./node_modules/bar/bar.js",
      "foo": "./node_modules/foo/foo.js"
    },
    "scopes": {}
  },
  "prod.importmap": {
    "imports": {
      "root/": "./",
      "foo/": "./node_modules/foo/",
      "root": "./index",
      "foo": "./node_modules/foo/foo.js"
    },
    "scopes": {}
  }
}
```
