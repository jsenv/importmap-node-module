1. return promise

2. console.warn
```console

Import resolution failed for "/foo.js"
--- import trace ---
base/input/main.js:2:7
  1 | // eslint-disable-next-line import/no-unresolved
> 2 | import "/foo.js";
    |       ^
  3 | 
--- reason ---
file not found on filesystem at /foo.js

```

3. write file "./input/1_leading_slash_node.importmap"
```importmap
{
  "imports": {},
  "scopes": {}
}
```

4. resolve
```js
{
  "1_leading_slash_node.importmap": {
    "imports": {},
    "scopes": {}
  }
}
```