# [0_basic](../../dependency_package_circular.test.mjs#L15)

```js
run()
```

# 1/2 write file "./root/test.importmap"

```importmap
{
  "imports": {
    "whatever/": "./",
    "whatever": "./index.js",
    "bar/": "./node_modules/bar/",
    "foo/": "./node_modules/foo/",
    "bar": "./node_modules/bar/bar.js",
    "foo": "./node_modules/foo/foo.js"
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
