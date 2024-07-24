1. return promise

2. console.warn
```console

Import resolution failed for "file"
--- import trace ---
file:///cwd()/input/index.js:2:7
  1 | // eslint-disable-next-line import/no-unresolved
> 2 | import "file";
    |       ^
  3 | 
--- reason ---
there is no mapping for this bare specifier
--- suggestion 1 ---
update import specifier to "./file.js"
--- suggestion 2 ---
use bareSpecifierAutomapping: true
--- suggestion 3 ---
add mapping to "manualImportmap"
{
  "imports": {
    "file": "./file.js"
  }
}

```

3. write file "input/0_bare_specifier_warning.importmap"
```importmap
{
  "imports": {},
  "scopes": {}
}
```

4. resolve
```js
{
  "0_bare_specifier_warning.importmap": {
    "imports": {},
    "scopes": {}
  }
}
```