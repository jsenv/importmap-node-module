# @jsenv/importmap-node-module [![npm package](https://img.shields.io/npm/v/@jsenv/importmap-node-module.svg?logo=npm&label=package)](https://www.npmjs.com/package/@jsenv/importmap-node-module)

> Generate import maps for browser-based execution of code that relies on Node.js module resolution

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Usage](#usage)
  - [CLI](#cli)
  - [API](#api)
- [API Options](#api-options)
- [Using Import Maps](#using-import-maps)
- [TypeScript Support](#typescript)
- [See Also](#see-also)

## Overview

This package generates [import maps](https://github.com/WICG/import-maps) that implement [Node.js ESM resolution algorithm](https://nodejs.org/docs/latest-v16.x/api/esm.html#esm_resolution_algorithm). With these import maps, code dependent on Node.js module resolution becomes executable in browsers.

**Example of code relying on Node.js module resolution:**

```js
import lodash from "lodash";
```

## How it works

1. Use `package.json` and `node_modules/**/package.json` to generate mappings corresponding to [node esm resolution algorithm](https://nodejs.org/docs/latest-v16.x/api/esm.html#esm_resolution_algorithm)
2. (Optional) Test importmap against all import found in js module files. This step allow to remove unused mappings to keep only thoose actually used in the codebase
3. Write mappings into a file

## Usage

### CLI

The simplest way to use this project is with `npx`:

```console
npx @jsenv/importmap-node-module index.html
```

This writes mappings in `index.html` inside a `<script type="importmap">` tag.

You can also write mappings to a separate file:

```console
npx @jsenv/importmap-node-module demo.importmap --entrypoint index.html
```

#### CLI Options

The CLI supports the following options:

- `--entrypoint <file>`: Confirm the specified file and its transitive dependencies can be resolved using the generated import map. Auto-enabled when importmap is written into an HTML file. Can be specified multiple times.
- `--dev`: Include devDependencies from `package.json`. Also favor `"development"` in [package exports](https://nodejs.org/docs/latest-v16.x/api/packages.html#packages_conditions_definitions)</a><sup>↗</sup>.
- `--keep-unused`: Keep all mappings, even if they are not currently used by entry file or its transitive dependencies.

### API

The API supports more options than the CLI.

1 - Create a script file (e.g., `generate_importmap.mjs`):

```js
import { writeImportmaps } from "@jsenv/importmap-node-module";

await writeImportmaps({
  directoryUrl: new URL("./", import.meta.url),
  importmaps: {
    "./index.html": {}, // Will embed importmap in index.html
  },
});
```

2 - Install dependencies

```console
npm install --save-dev @jsenv/importmap-node-module
```

3 - Run the script:

```console
node ./generate_importmap.mjs
# <script type="importmap"> content updated into "/demo/index.html"
```

### More advanced example

```js
import { writeImportmaps } from "@jsenv/importmap-node-module";

await writeImportmaps({
  directoryUrl: new URL("./", import.meta.url),
  importmaps: {
    // Generate a development importmap
    "./dev.importmap": {
      nodeMappings: {
        devDependencies: true,
        packageUserConditions: ["development"],
      },
      importResolution: {
        entryPoints: ["index.js"],
      },
    },
    // Generate a production importmap
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

### API options

The writeImportmaps function generates and writes one or more import maps to files.

#### Required Options

##### `directoryUrl` (string|URL)

Path to a folder containing a `package.json` file.

##### `importmaps` (object)

An object where keys are file paths (relative URLs) and values are configuration objects for the mappings to be written in those files.

#### Configuration Options

Each entry in the `importmaps` object can have the following configuration:

##### `nodeMappings` (object|boolean)

Configuration for mappings generated to implement Node.js module resolution. Set to false to disable Node.js mappings entirely.

> **Note:** Node modules must be present on your filesystem as the structure is used to generate the importmap. Run `npm install` before generating importmaps.

##### `nodeMappings.devDependencies` (boolean)

_nodeMappings.devDependencies_ is a boolean. When enabled, mappings for `"devDependencies"` declared in your _package.json_ are generated.

_nodeMappings.devDependencies_ is optional.

##### `nodeMappings.packageUserConditions` (string[])

Controls which [package.json conditions](https://nodejs.org/dist/latest-v15.x/docs/api/packages.html#packages_conditions_definitions) are favored.

_nodeMappings.packageUserConditions_ is optional.

Conditions are picked in this order:

1. conditions passed in `packageUserConditions`
2. `"import"`
3. `"browser"`
4. `"default"`

> User `packageUserConditions: ["node"]` if generating an importmap for Node.js instead of browsers.

##### `importResolution` (object|boolean)

When provided, the generated mappings will be used to resolve JS imports found in entryPoints and their transitive dependencies. Set to `false` to disable entirely.

When the importmap is written to a file ending with `.html`, import resolution automatically starts from the HTML file (unless disabled).

##### `importResolution.entryPoints` (string[])

Array of file paths (relative URLs) to use as entry points for imports.

##### `importResolution.magicExtensions` (string[])

Array of extensions to try when an import cannot be resolved to a file.

Use `"inherit"` to try the same extension as the importing file:

```js
import { writeImportmaps } from "@jsenv/importmap-node-module";

await writeImportmaps({
  directoryUrl: new URL("./", import.meta.url),
  importmaps: {
    "./demo.importmap": {
      importResolution: {
        entryPoints: ["./demo.js"],
        magicExtensions: ["inherit", ".js"], // Try importer's extension, then .js
      },
    },
  },
});
```

Example of extension inheritance:

| importer path        | Path tried when importing "./helper" |
| -------------------- | ------------------------------------ |
| /Users/dmail/file.js | /Users/dmail/helper.js               |
| /Users/dmail/file.ts | /Users/dmail/helper.ts               |

All other values in _magicExtensions_ are file extensions that will be tried one after an other.

##### `importResolution.runtime` (string)

Specifies the runtime environment to determine how to resolve JS imports. Defaults to `"browser"`.

For example, `import { writeFile } from "node:fs"` is valid when runtime is `"node"` but would log a warning with `"browser"`.

##### `importResolution.keepUnusedMappings` (boolean)

When `true`, mappings will be kept even if they aren't used by any imports found in JS files.

##### `manualImportmap` (object)

An object containing mappings to add to the importmap. Useful for providing additional mappings or overriding node mappings.

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

##### `packagesManualOverrides` (object)

An object to override `package.json` files of dependencies.

Useful when dependencies use non-standard fields to configure entry points instead of the standard `"exports"` field described in the [Node.js documentation](https://nodejs.org/dist/latest-v16.x/docs/api/packages.html#packages_package_entry_points)

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

## Using import maps

As of this documentation's writing, browsers don't support external import maps:

```console
External import maps are not yet supported
```

For browser usage, instruct `@jsenv/importmap-node-module` to inline importmap into an HTML file as shown in [CLI](#CLI) section.

## TypeScript

This tool can generate import maps to make TypeScript-compiled code executable in browsers.

You need your `package.json` and `node_modules` in the directory where TypeScript outputs JS files. Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "prebuild": "rm -rf dist",
    "build": "tsc",
    "postbuild": "cp package.json dist && ln -sf ../node_modules ./dist/node_modules"
  }
}
```

Then generate the importmap with:

```js
import { writeImportmaps } from "@jsenv/importmap-node-module";

await writeImportmaps({
  directoryUrl: new URL("./dist/", import.meta.url),
  importmaps: {
    "./index.html": {
      importResolution: {
        magicExtensions: ["inherit"],
      },
    },
  },
});
```

## See also

- [./docs/example/](./docs/examples/)
- [Configuring VSCode and ESLint for importmap](./docs/vscode_and_eslint.md#configure-vscode-and-eslint-for-importmap)
