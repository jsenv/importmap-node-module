1. return promise

2. console.warn
```console
remove src=./project.importmap from <script type="module">
```

3. write file "git_ignored/index.html"
```html
<!DOCTYPE html>
<html>
  <head>
    <title>Title</title>
    <meta charset="utf-8">
    <link rel="icon" href="data:,">
  </head>

  <body>
    <script type="importmap">
      {
        "imports": {
          "foo": "./node_modules/foo/foo.js"
        },
        "scopes": {}
      }
    </script>
    <script type="module" src="./main.js"></script>
  </body>
</html>
```

4. resolve
```js
{
  "index.html": {
    "imports": {
      "foo": "./node_modules/foo/foo.js"
    },
    "scopes": {}
  }
}
```