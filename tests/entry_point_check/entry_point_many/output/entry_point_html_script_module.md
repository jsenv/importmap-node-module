1. return promise

2. write file "./input/test.importmap"
```importmap
{
  "imports": {
    "root/": "./"
  },
  "scopes": {}
}
```

3. resolve
```js
{
  "test.importmap": {
    "imports": {
      "root/": "./"
    },
    "scopes": {}
  }
}
```