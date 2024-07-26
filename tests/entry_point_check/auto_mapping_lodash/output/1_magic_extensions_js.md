1. return promise

2. write file "./input/test.importmap"
```importmap
{
  "imports": {
    "lodash/union": "./node_modules/lodash/union.js",
    "lodash/": "./node_modules/lodash/"
  },
  "scopes": {}
}
```

3. resolve
```js
{
  "test.importmap": {
    "imports": {
      "lodash/union": "./node_modules/lodash/union.js",
      "lodash/": "./node_modules/lodash/"
    },
    "scopes": {}
  }
}
```