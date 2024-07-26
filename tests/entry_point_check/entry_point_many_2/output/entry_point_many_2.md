1. return promise

2. write file "./git_ignored/index.html"
```html
<!DOCTYPE html>
<html>
  <head>
    <title>Title</title>
    <meta charset="utf-8">
    <link rel="icon" href="data:,">
    <script type="importmap" jsenv-injected-by="@jsenv/importmap-node-module">
      {
        "imports": {
          "foo/a": "./node_modules/foo/a.js",
          "foo": "./node_modules/foo/foo.js"
        },
        "scopes": {}
      }
    </script>
  </head>

  <body>
    <script type="module" src="./index.js"></script>
  </body>
</html>
```

3. write file "./git_ignored/about.html"
```html
<!DOCTYPE html>
<html>
  <head>
    <title>Title</title>
    <meta charset="utf-8">
    <link rel="icon" href="data:,">
    <script type="importmap" jsenv-injected-by="@jsenv/importmap-node-module">
      {
        "imports": {
          "foo/b": "./node_modules/foo/b.js",
          "foo": "./node_modules/foo/foo.js"
        },
        "scopes": {}
      }
    </script>
  </head>

  <body>
    <script type="module" src="./about.js"></script>
  </body>
</html>
```

4. resolve
```js
{
  "index.html": {
    "imports": {
      "foo/a": "./node_modules/foo/a.js",
      "foo": "./node_modules/foo/foo.js"
    },
    "scopes": {}
  },
  "about.html": {
    "imports": {
      "foo/b": "./node_modules/foo/b.js",
      "foo": "./node_modules/foo/foo.js"
    },
    "scopes": {}
  }
}
```