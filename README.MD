# @jsenv/importmap-node-module [![npm package](https://img.shields.io/npm/v/@jsenv/importmap-node-module.svg?logo=npm&label=package)](https://www.npmjs.com/package/@jsenv/importmap-node-module)

Generate [import map](https://github.com/WICG/import-maps) with mappings corresponding to [node esm resolution algorithm](https://nodejs.org/docs/latest-v16.x/api/esm.html#esm_resolution_algorithm). The importmap can be used to make code dependent on node module resolution executable in a browser.

_Example of code relying on node module resolution:_

```js
import lodash from "lodash";
```

# How it works

1. Use `package.json` and `node_modules/**/package.json` to generate mappings corresponding to [node esm resolution algorithm](https://nodejs.org/docs/latest-v16.x/api/esm.html#esm_resolution_algorithm)
2. (Optional) Test importmap against all import found in js module files. This step allow to remove unused mappings to keep only thoose actually used in the codebase
3. Write the mappings into into a file

# Usage

## CLI

The simplest way to use this project is with `npx`:

```console
npx @jsenv/importmap-node-module project.importmap
```

The CLI supports the following options:

- `--include-dev`: Include devDependencies from package.json.
- `--entrypoint`: Confirm the specified file and its transitive dependencies can be resolved using the generated import map. Can be specified multiple times.
- `--remove-unused`: Remove mappings not used by any entrypoint or their transitive dependencies. Requires `--entrypoint`.

## API

The API supports a few more options than the CLI.

1 - Create _generate_importmap.mjs_

```js
import { writeImportMapFiles } from "@jsenv/importmap-node-module";

await writeImportMapFiles({
  projectDirectoryUrl: new URL("./", import.meta.url),
  importMapFiles: {
    "./project.importmap": {
      mappingsForNodeResolution: true,
    },
  },
});
```

2 - Install dependencies

```console
npm install --save-dev @jsenv/importmap-node-module
```

3 - Generate _project.importmap_

```console
node ./generate_importmap.mjs
-> /Users/d.maillard/importmap-node-module/docs/demo/project.importmap
```

# API options

_writeImportMapFiles_ is an async function generating one or many importmap files.

```js
import { writeImportMapFiles } from "@jsenv/importmap-node-module";

await writeImportMapFiles({
  projectDirectoryUrl: new URL("./", import.meta.url),
  importMapFiles: {
    "./importmap_for_dev.importmap": {
      mappingsForNodeResolution: true,
      mappingsForDevDependencies: true,
    },
    "./importmap_for_prod.importmap": {
      mappingsForNodeResolution: true,
    },
  },
});
```

It supports the following options:

## projectDirectoryUrl

_projectDirectoryUrl_ is a string/url leading to a folder with a _package.json_.

_projectDirectoryUrl_ is **required**.

## importMapFiles

_importMapFiles_ is an object where keys are file relative urls and value are objects configuring which mappings will be written in the importmap files.

_importMapFiles_ is **required**.

### mappingsForNodeResolution

_mappingsForNodeResolution_ is a boolean. When enabled mappings required to implement node module resolution are generated.

_mappingsForNodeResolution_ is optional.

> Be sure node modules are on your filesystem because we'll use the filesystem structure to generate the importmap. For that reason, you must use it after `npm install` or anything that is responsible to generate the node_modules folder and its content on your filesystem.

### mappingsForDevDependencies

_mappingsForDevDependencies_ is a boolean. When enabled, `"devDependencies"` declared in your _package.json_ are included in the generated importMap.

_mappingsForDevDependencies_ is optional.

### runtime

_runtime_ is a string used to determine what to pick in [package.json conditions](https://nodejs.org/docs/latest-v16.x/api/packages.html#packages_conditions_definitions).

_runtime_ is optional and defaults to `"browser"`.

```js
import { writeImportMapFiles } from "@jsenv/importmap-node-module";

await writeImportMapFiles({
  projectDirectoryUrl: new URL("./", import.meta.url),
  importMapFiles: {
    "./browser.importmap": {
      mappingsForNodeResolution: true,
      runtime: "browser",
    },
    "./node.importmap": {
      mappingsForNodeResolution: true,
      runtime: "node",
    },
  },
});
```

### packageUserConditions

_packageUserConditions_ is an array controlling which conditions are favored in [package.json conditions](https://nodejs.org/dist/latest-v15.x/docs/api/packages.html#packages_conditions_definitions).

_packageUserConditions_ is optional.

```js
import { writeImportMapFiles } from "@jsenv/importmap-node-module";

await writeImportMapFiles({
  projectDirectoryUrl: new URL("./", import.meta.url),
  importMapFiles: {
    "./dev.importmap": {
      mappingsForNodeResolution: true,
      packageUserConditions: ["development"],
    },
    "./prod.importmap": {
      mappingsForNodeResolution: true,
      packageUserConditions: ["production"],
    },
  },
});
```

### entryPointsToCheck

_entryPointsToCheck_ is an array composed of string representing file relative urls. Each file is considered as an entry point using the import mappings. For each entry point, _writeImportMapFiles_ will check if import can be resolved and repeat this process for every static and dynamic import. You can also pass HTML file(s).

_entryPointsToCheck_ is optional.

```js
import { writeImportMapFiles } from "@jsenv/importmap-node-module";

await writeImportMapFiles({
  projectDirectoryUrl: new URL("./", import.meta.url),
  importMapFiles: {
    "./project.importmap": {
      mappingsForNodeResolution: true,
      entryPointsToCheck: ["./main.js"],
    },
  },
});
```

It is recommended to use _entryPointsToCheck_ as it gives confidence in the generated importmap. When an import cannot be resolved, a warning is logged.

### magicExtensions

_magicExtensions_ is an array of strings. Each string represent an extension that will be tried when an import cannot be resolved to a file.

_magicExtensions_ is optional. It must be used with _entryPointsToCheck_.

```js
import { writeImportMapFiles } from "@jsenv/importmap-node-module";

await writeImportMapFiles({
  projectDirectoryUrl: new URL("./", import.meta.url),
  importMapFiles: {
    "./test.importmap": {
      mappingsForNodeResolution: true,
      entryPointsToCheck: ["./main.js"],
      magicExtensions: ["inherit", ".js"],
    },
  },
});
```

`"inherit"` means the extension tried in taken from the importer.

```js
import "./helper";
```

| importer path        | path tried             |
| -------------------- | ---------------------- |
| /Users/dmail/file.js | /Users/dmail/helper.js |
| /Users/dmail/file.ts | /Users/dmail/helper.ts |

All other values in _magicExtensions_ are file extensions that will be tried one after an other.

### removeUnusedMappings

_removeUnusedMappings_ is a boolean. When enabled mappings will be treeshaked according to the import found in js files.

_removeUnusedMappings_ is optional. It must be used with _entryPointsToCheck_.

```js
import { writeImportMapFiles } from "@jsenv/importmap-node-module";

await writeImportMapFiles({
  projectDirectoryUrl: new URL("./", import.meta.url),
  importMapFiles: {
    "./test.importmap": {
      mappingsForNodeResolution: true,
      entryPointsToCheck: ["./main.js"],
      removeUnusedMappings: true,
    },
  },
});
```

It is recommended to enable _removeUnusedMappings_ so that importmap contains only the mappings actually used by your codebase.

### manualImportMap

_manualImportMap_ is an object containing mappings that will be added to the importmap. This can be used to provide additional mappings and/or override node mappings.

_manualImportMap_ is optional.

```js
import { writeImportMapFiles } from "@jsenv/importmap-node-module";

await writeImportMapFiles({
  projectDirectoryUrl: new URL("./", import.meta.url),
  importMapFiles: {
    "./test.importmap": {
      mappingsForNodeResolution: true,
      manualImportMap: {
        imports: {
          "#env": "./env.js",
        },
      },
    },
  },
});
```

## packagesManualOverrides

_packagesManualOverrides_ is an object that can be used to override some of your dependencies package.json.

_packagesManualOverrides_ is optional.

_packagesManualOverrides_ exists in case some of your dependencies use non standard fields to configure their entry points in their _package.json_. Ideally they should use `"exports"` field documented in https://nodejs.org/dist/latest-v16.x/docs/api/packages.html#packages_package_entry_points. But not every one has updated to this new field yet.

```js
import { writeImportMapFiles } from "@jsenv/importmap-node-module";

await writeImportMapFiles({
  projectDirectoryUrl: new URL("./", import.meta.url),
  importMapFiles: {
    "./test.importmap": {
      mappingsForNodeResolution: true,
    },
  },
  // overrides "react-redux" package because it uses a non-standard "module" field
  // to expose "es/index.js" entry point
  // see https://github.com/reduxjs/react-redux/blob/9021feb9ff573b01b73084f1a7d10b322e6f0201/package.json#L18
  packageManualOverrides: {
    "react-redux": {
      exports: {
        import: "./es/index.js",
      },
    },
  },
});
```

# Using import maps

Add _project.importmap_ to your html

```diff
<!DOCTYPE html>
<html>
  <head>
    <title>Title</title>
    <meta charset="utf-8" />
    <link rel="icon" href="data:," />
+   <script type="importmap" src="./project.importmap"></script>
  </head>

  <body>
    <script type="module">
      import lodash from "lodash"
    </script>
  </body>
</html>
```

If you use a bundler or an other tool, be sure it's compatible with import maps.
As import map are standard the bundler/tool might be compatible by default or with the help of some plugin/configuration.

# TypeScript

This repository can generate importmap to make code produced by the TypeScript compiler executable in a browser.

You need to have your _package.json_ and _node_modules_ into the directory where typescript output js files.
You can achieve this with the following "scripts" in your _package.json_.

```json
{
  "scripts": {
    "prebuild": "rm -rf dist",
    "build": "tsc",
    "postbuild": "cp package.json dist && ln -sf ../node_modules ./dist/node_modules"
  }
}
```

Then you can use the script below to produce the importmap.

```js
import { writeImportMapFiles } from "@jsenv/importmap-node-module";

await writeImportMapFiles({
  projectDirectoryUrl: new URL("./dist/", import.meta.url),
  importMapFiles: {
    "./project.importmap": {
      mappingsForNodeResolution: true,
      entryPointsToCheck: ["./index.js"],
      magicExtensions: ["inherit"],
      removeUnusedMappings: true,
    },
  },
});
```

# See also

- [./docs/example/](./docs/examples/)
- [Configuring VSCode and ESLint for importmap](./docs/vscode_and_eslint.md#configure-vscode-and-eslint-for-importmap)
