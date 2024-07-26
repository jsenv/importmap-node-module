1. return promise

2. write file "./input/test.importmap"
```importmap
{
  "imports": {
    "#env": "./env.dev.js"
  },
  "scopes": {}
}
```

3. resolve
```js
{
  "test.importmap": {
    "imports": {
      "#env": "./env.dev.js"
    },
    "scopes": {}
  }
}
```