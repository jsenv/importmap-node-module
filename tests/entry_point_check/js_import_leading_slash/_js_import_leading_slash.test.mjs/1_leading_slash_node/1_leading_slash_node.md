# [1_leading_slash_node](../../js_import_leading_slash.test.mjs#L29)

```js
run({
  runtime: "node",
})
```

# 1/3 console.warn

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

# 2/3 write file "./input/test.importmap"

```importmap
{
  "imports": {},
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
