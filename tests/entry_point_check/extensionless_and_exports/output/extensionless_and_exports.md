1. return promise

2. write file "input/test.importmap"
```importmap
{
  "imports": {
    "foo/file.js": "./node_modules/foo/file.js"
  },
  "scopes": {}
}
```

3. resolve
```js
{
  "./test.importmap": {
    "imports": {
      "foo/file.js": "./node_modules/foo/file.js"
    },
    "scopes": {}
  }
}
```