# @jsenv/importmap-node-module [![npm package](https://img.shields.io/npm/v/@jsenv/importmap-node-module.svg?logo=npm&label=package)](https://www.npmjs.com/package/@jsenv/importmap-node-module)

Generate [import map](https://github.com/WICG/import-maps) with mappings corresponding to [node esm resolution algorithm](https://nodejs.org/docs/latest-v16.x/api/esm.html#esm_resolution_algorithm). The importmap can be used to make code dependent on node module resolution executable in a browser.

_Example of code relying on node module resolution:_

```js
import lodash from "lodash";
```

# How it works

1. Use `package.json` and `node_modules/**/package.json` to generate mappings corresponding to [node esm resolution algorithm](https://nodejs.org/docs/latest-v16.x/api/esm.html#esm_resolution_algorithm)
2. (Optional) Test importmap against all import found in js module files. This step allow to remove unused mappings to keep only thoose actually used in the codebase
3. Write mappings into a file

# Usage

## CLI

The simplest way to use this project is with `npx`:

```console
npx @jsenv/importmap-node-module index.html
```

It will write mappings in _index.html_, inside a `<script type="importmap">`.  
It is also possible to write mappings into a separate file as follow:

```console
npx @jsenv/importmap-node-module demo.importmap --entrypoint index.html
```

The CLI supports the following options:

- `--entrypoint`: Confirm the specified file and its transitive dependencies can be resolved using the generated import map. Auto enabled when importmap is written into .html file. Can be specified multiple times.
- `--dev`: Include devDependencies from package.json. Also favor `"development"` in [package exports](https://nodejs.org/docs/latest-v16.x/api/packages.html#packages_conditions_definitions)</a><sup>↗</sup>.
- `--keep-unused`: Keep all mappings, even if they are not currently used by entry file or its transitive dependencies.

## API

The API supports a few more options than the CLI.

1 - Create _generate_importmap.mjs_

```js
import { writeImportmaps } from "@jsenv/importmap-node-module";

await writeImportmaps({
  directoryUrl: new URL("./", import.meta.url),
  importmaps: {
    "./index.html": {},
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
<script type="importmap"> content updated into "/demo/index.html"
```

## API options

_writeImportmaps_ is an async function generating one or many importmap and writing them into files.

```js
import { writeImportmaps } from "@jsenv/importmap-node-module";

await writeImportmaps({
  directoryUrl: new URL("./", import.meta.url),
  importmaps: {
    "./dev.importmap": {
      nodeMappings: {
        devDependencies: true,
        packageUserConditions: ["development"],
      },
      importResolution: {
        entryPoints: ["index.js"],
      },
    },
    "./prod.importmap": {
      nodeMappings: {
        devDependencies: false,
        packageUserConditions: ["production"],
      },
      importResolution: {
        entryPoints: ["index.js"],
      },
    },
  },
});
```

It supports the following options:

### directoryUrl

_directoryUrl_ is a string/url leading to a folder with a _package.json_.

_directoryUrl_ is **required**.

### importmaps

_importmaps_ is an object where keys are file relative urls and value are objects configuring which mappings will be written in the files.

_importmaps_ is **required**.

#### nodeMappings

_nodeMappings_ is an object configuring the mappings generated to implement node module resolution.

_nodeMappings_ is optional.

> Be sure node modules are on your filesystem because we'll use the filesystem structure to generate the importmap. For that reason, you must use it after `npm install` or anything that is responsible to generate the node_modules folder and its content on your filesystem.

In case you don't need to mappings corresponding to node resolution, they can be disabled:

```js
import { writeImportmaps } from "@jsenv/importmap-node-module";

await writeImportmaps({
  directoryUrl: new URL("./", import.meta.url),
  importmaps: {
    "./demo.importmap": {
      nodeMappings: false,
    },
  },
});
```

##### nodeMappings.devDependencies

_nodeMappings.devDependencies_ is a boolean. When enabled, mappings for `"devDependencies"` declared in your _package.json_ are generated.

_nodeMappings.devDependencies_ is optional.

##### nodeMappings.packageUserConditions

_nodeMappings.packageUserConditions_ is an array controlling which conditions are favored in [package.json conditions](https://nodejs.org/dist/latest-v15.x/docs/api/packages.html#packages_conditions_definitions).

_nodeMappings.packageUserConditions_ is optional.

The following conditions will be picked:

1. conditions passed in _nodeMappings.packageUserConditions_
2. `"import"`
3. `"browser"`
4. `"default"`

> Be sure to use `packageUserConditions: ["node"]` if the importmap is generated for node and not for the browser.

#### importResolution

_importResolution_ is an object. When passed the generated mappings will be used to resolve js imports found in entryPoints and their transitive dependencies. When a js import cannot be resolved a warning is logged.

_importResolution_ is optional. When the importmap file is written inside a file ending with `.html` the import resolution starts from the `.html` file. Otherwise _importResolution.entryPoints_ must be configured.

It is possible to disable importResolution entirely:

```js
import { writeImportmaps } from "@jsenv/importmap-node-module";

await writeImportmaps({
  directoryUrl: new URL("./", import.meta.url),
  importmaps: {
    "./index.html": {
      importResolution: false,
    },
  },
});
```

##### importResolution.entryPoints

_importResolution.entryPoints_ is an array composed of string representing file relative urls. Each file is considered as an entry point using the import mappings.

_importResolution.entryPoints_ is optional.

It is recommended to use _importResolution.entryPoints_ as it gives confidence in the generated importmap.

##### importResolution.magicExtensions

_importResolution.magicExtensions_ is an array of strings. Each string represent an extension that will be tried when an import cannot be resolved to a file.

_importResolution.magicExtensions_ is optional.

```js
import { writeImportmaps } from "@jsenv/importmap-node-module";

await writeImportmaps({
  directoryUrl: new URL("./", import.meta.url),
  importmaps: {
    "./demo.importmap": {
      importResolution: {
        entryPoints: ["./demo.js"],
        magicExtensions: ["inherit", ".js"],
      },
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

##### importResolution.runtime

_importResolution.runtime_ is a string used to know how to resolve js imports.

For example the following import is correct when runtime is `"node"` but would log a warning when runtime is `"browser"`.

```js
import { writeFile } from "node:fs";
```

_importResolution.runtime_ is optional and defaults to `"browser"`.

#### importResolution.keepUnusedMappings

_importResolution.keepUnusedMappings_ is a boolean. When enabled mappings will be kept even if not currently used by import found in js files.

_importResolution.keepUnusedMappings_ is optional.

```js
import { writeImportmaps } from "@jsenv/importmap-node-module";

await writeImportmaps({
  directoryUrl: new URL("./", import.meta.url),
  importmaps: {
    "./demo.html": {
      importResolution: {
        keepUnusedMappings: true,
      },
    },
  },
});
```

It is recommended to enable _removeUnusedMappings_ so that importmap contains only the mappings actually used by your codebase.

#### manualImportmap

_manualImportmap_ is an object containing mappings that will be added to the importmap. This can be used to provide additional mappings and/or override node mappings.

_manualImportmap_ is optional.

```js
import { writeImportmaps } from "@jsenv/importmap-node-module";

await writeImportmaps({
  directoryUrl: new URL("./", import.meta.url),
  importmaps: {
    "./demo.importmap": {
      manualImportmap: {
        imports: {
          "#env": "./env.js",
        },
      },
    },
  },
});
```

### packagesManualOverrides

_packagesManualOverrides_ is an object that can be used to override some of your dependencies package.json.

_packagesManualOverrides_ is optional.

_packagesManualOverrides_ exists in case some of your dependencies use non standard fields to configure their entry points in their _package.json_. Ideally they should use `"exports"` field documented in https://nodejs.org/dist/latest-v16.x/docs/api/packages.html#packages_package_entry_points. But not every one has updated to this new field yet.

```js
import { writeImportmaps } from "@jsenv/importmap-node-module";

await writeImportmaps({
  directoryUrl: new URL("./", import.meta.url),
  importmaps: {
    "./demo.importmap": {},
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

At the time of writing this documentation external importmap are not supported by web browsers:

```console
External import maps are not yet supported
```

If you plan to use importmap in a web browser you need to tell `@jsenv/importmap-node-module` to inline importmap into the HTML file as shown in [API](#API).

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
import { writeImportmaps } from "@jsenv/importmap-node-module";

await writeImportmaps({
  directoryUrl: new URL("./dist/", import.meta.url),
  importmaps: {
    "./demo.html": {
      importResolution: {
        magicExtensions: ["inherit"],
      },
    },
  },
});
```

# See also

- [./docs/example/](./docs/examples/)
- [Configuring VSCode and ESLint for importmap](./docs/vscode_and_eslint.md#configure-vscode-and-eslint-for-importmap)
