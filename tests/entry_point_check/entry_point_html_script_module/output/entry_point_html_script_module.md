1. return promise

2. write file "input/test.importmap"
```importmap
{
  "imports": {
    "inline_everything": "./everything.js",
    "a_everything": "./everything.js",
    "b_everything": "./everything.js",
    "c_everything": "./everything.js",
    "a": "./a.js"
  },
  "scopes": {}
}
```

3. resolve
```js
{
  "test.importmap": {
    "imports": {
      "inline_everything": "./everything.js",
      "a_everything": "./everything.js",
      "b_everything": "./everything.js",
      "c_everything": "./everything.js",
      "a": "./a.js"
    },
    "scopes": {}
  }
}
```