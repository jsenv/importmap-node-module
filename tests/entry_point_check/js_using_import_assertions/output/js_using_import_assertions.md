1. return promise

2. write file "input/test.importmap"
```importmap
{
  "imports": {
    "./file": "./file.js"
  },
  "scopes": {}
}
```

3. resolve
```js
{
  "test.importmap": {
    "imports": {
      "./file": "./file.js"
    },
    "scopes": {}
  }
}
```