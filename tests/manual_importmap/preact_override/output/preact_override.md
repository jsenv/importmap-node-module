1. return promise

2. write file "input/test.importmap"
```importmap
{
  "imports": {
    "react-redux/": "./node_modules/react-redux/",
    "react-redux": "./node_modules/react-redux/index.js",
    "react/": "./node_modules/react/",
    "react": "./node_modules/react/index.js",
    "root/": "./",
    "root": "./index.js"
  },
  "scopes": {
    "./node_modules/react-redux/": {
      "react": "./node_modules/preact/compat/src/index.js"
    }
  }
}
```

3. resolve
```js
{
  "test.importmap": {
    "imports": {
      "react-redux/": "./node_modules/react-redux/",
      "react-redux": "./node_modules/react-redux/index.js",
      "react/": "./node_modules/react/",
      "react": "./node_modules/react/index.js",
      "root/": "./",
      "root": "./index.js"
    },
    "scopes": {
      "./node_modules/react-redux/": {
        "react": "./node_modules/preact/compat/src/index.js"
      }
    }
  }
}
```