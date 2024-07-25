1. return promise

2. write file "input/test.importmap"
```importmap
{
  "imports": {
    "http://example.com/foo.js": "http://example.com/bar.js"
  },
  "scopes": {}
}
```

3. resolve
```js
{
  "test.importmap": {
    "imports": {
      "http://example.com/foo.js": "http://example.com/bar.js"
    },
    "scopes": {}
  }
}
```