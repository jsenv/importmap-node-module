1. return promise

2. console.warn
```console

Import resolution failed for "./main.js"
--- import trace ---
entryPoints parameter
--- reason ---
file not found on filesystem at <root>/git_ignored/main.js

```

3. write file "git_ignored/test.importmap"
```importmap
{
  "imports": {},
  "scopes": {}
}
```

4. resolve
```js
{
  "test.importmap": {
    "imports": {},
    "scopes": {}
  }
}
```