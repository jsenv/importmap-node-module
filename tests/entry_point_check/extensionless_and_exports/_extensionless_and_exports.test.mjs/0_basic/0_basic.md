# [0_basic](../../extensionless_and_exports.test.mjs#L20)

```js
run()
```

# 1/2 write file "./input/test.importmap"

```importmap
{
  "imports": {
    "foo/file.js": "./node_modules/foo/file.js"
  },
  "scopes": {}
}
```

# 2/2 resolve

```js
undefined
```

---

<sub>
  Generated by <a href="https://github.com/jsenv/core/tree/main/packages/tooling/snapshot">@jsenv/snapshot</a>
</sub>
