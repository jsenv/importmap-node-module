1. return promise

2. console.warn
```console

Import resolution failed for "lodash/union"
--- import trace ---
file:///cwd()/input/main.js:2:22
  1 | // eslint-disable-next-line import/no-unresolved
> 2 | import { union } from "lodash/union";
    |                      ^
  3 | 
--- reason ---
file not found on filesystem at cwd()/input/node_modules/lodash/union

```

3. write file "input/test.importmap"
```importmap
{
  "imports": {
    "lodash/": "./node_modules/lodash/"
  },
  "scopes": {}
}
```

4. resolve
```js
{
  "test.importmap": {
    "imports": {
      "lodash/": "./node_modules/lodash/"
    },
    "scopes": {}
  }
}
```