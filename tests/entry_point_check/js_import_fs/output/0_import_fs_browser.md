1. return promise

2. console.warn
```console

Import resolution failed for "fs"
--- import trace ---
file:///<root>/input/index.js:1:7
> 1 | import "fs";
    |       ^
  2 | 
--- reason ---
there is no mapping for this bare specifier
--- suggestion 1 ---
use runtime: "node"

```

3. write file "input/0_import_fs_browser.importmap"
```importmap
{
  "imports": {},
  "scopes": {}
}
```

4. resolve
```js
{
  "0_import_fs_browser.importmap": {
    "imports": {},
    "scopes": {}
  }
}
```