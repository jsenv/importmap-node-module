# [0_magic_extensions_ts](../../auto_mapping_lodash.test.mjs#L20)

```js
run({
  magicExtensions: [".ts"],
})
```

# 1/3 console.warn

```console

Import resolution failed for "lodash/union"
--- import trace ---
base/input/main.js:2:22
  1 | // eslint-disable-next-line import/no-unresolved
> 2 | import { union } from "lodash/union";
    |                      ^
  3 | 
--- reason ---
file not found on filesystem at base/input/node_modules/lodash/union

```

# 2/3 write file "./input/test.importmap"

```importmap
{
  "imports": {
    "lodash/": "./node_modules/lodash/"
  },
  "scopes": {}
}
```

# 3/3 resolve

```js
undefined
```

---

<sub>
  Generated by <a href="https://github.com/jsenv/core/tree/main/packages/tooling/snapshot">@jsenv/snapshot</a>
</sub>
