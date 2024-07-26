1. return promise

2. write file "./input/test.importmap"
```importmap
{
  "imports": {
    "root/": "./",
    "root": "./index.js"
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
      "root": "./index.js"
    },
    "scopes": {}
  }
}
```