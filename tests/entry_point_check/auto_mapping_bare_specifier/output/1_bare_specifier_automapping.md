1. return promise

2. write file "./input/1_bare_specifier_automapping.importmap"
```importmap
{
  "imports": {
    "file": "./file.js"
  },
  "scopes": {}
}
```

3. resolve
```js
{
  "1_bare_specifier_automapping.importmap": {
    "imports": {
      "file": "./file.js"
    },
    "scopes": {}
  }
}
```