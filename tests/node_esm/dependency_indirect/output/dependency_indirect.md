1. return promise

2. write file "input/test.importmap"
```importmap
{
  "imports": {
    "b": "./node_modules/b/index.js"
  },
  "scopes": {}
}
```

3. resolve
```js
{
  "./test.importmap": {
    "imports": {
      "b": "./node_modules/b/index.js"
    },
    "scopes": {}
  }
}
```