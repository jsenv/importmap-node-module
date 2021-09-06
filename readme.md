# import map node module

Generate importmap for node_modules.

[![npm package](https://img.shields.io/npm/v/@jsenv/importmap-node-module.svg?logo=npm&label=package)](https://www.npmjs.com/package/@jsenv/importmap-node-module)
[![github ci](https://github.com/jsenv/importmap-node-module/workflows/ci/badge.svg)](https://github.com/jsenv/importmap-node-module/actions?workflow=ci)
[![codecov coverage](https://codecov.io/gh/jsenv/importmap-node-module/branch/master/graph/badge.svg)](https://codecov.io/gh/jsenv/importmap-node-module)

# Presentation

Generates [import map](https://github.com/WICG/import-maps) with mappings corresponding to [node esm resolution algorithm](https://nodejs.org/docs/latest-v16.x/api/esm.html#esm_resolution_algorithm). This importmap can be used to make code dependent on node module resolution executable in a browser.

_Example of code relying on node module resolution_

```js
import lodash from "lodash"
```

# Usage

1 - Install _@jsenv/importmap-node-module_

```console
npm install --save-dev @jsenv/importmap-node-module
```

2 - Create _generate_importmap.mjs_

```js
import { writeImportMapFiles } from "@jsenv/importmap-node-module"

await writeImportMapFiles({
  projectDirectoryUrl: new URL("./", import.meta.url),
  importMapFiles: {
    "./project.importmap": {
      mappingsForNodeResolution: true,
    },
  },
})
```

3 - Generate _project.importmap_

```console
node ./generate_importmap.mjs
```

4 - Add _project.importmap_ to your html

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
If you don't know what to use check [@jsenv/core](https://github.com/jsenv/jsenv-core#presentation).

At this stage you have generated an importmap with mappings corresponding to node resolution.
The rest of the documentation go into details.

# writeImportMapFiles

_writeImportMapFiles_ is an async function generating one or many importmap files.

```js
import { writeImportMapFiles } from "@jsenv/importmap-node-module"

await writeImportMapFiles({
  projectDirectoryUrl: new URL("./", import.meta.url),
  importMapFiles: {
    "./importmap_for_dev.importmap": {
      mappingsForNodeResolution: true,
      mappingsForDevDependencies: true,
      checkImportResolution: true,
    },
    "./importmap_for_prod.importmap": {
      mappingsForNodeResolution: true,
      checkImportResolution: true,
      removeUnusedMappings: true,
    },
  },
})
```

## projectDirectoryUrl

_projectDirectoryUrl_ parameter is a string url leading to a folder with a _package.json_. This parameters is **required** and accepted values are documented in [@jsenv/filesystem#assertAndNormalizeDirectoryUrl](https://github.com/jsenv/jsenv-util#assertandnormalizedirectoryurl)

## importMapFiles

_importMapFiles_ parameter is an object where keys are importmap file relative urls and values are parameters controlling the mappings that will be written in the importmap file.

## initialImportMap

_initialImportMap_ parameter is an importMap object that can be used to provide initial mappings.
This parameter is optional and by default it's an empty object.

```js
import { writeImportMapFiles } from "@jsenv/importmap-node-module"

await writeImportMapFiles({
  projectDirectoryUrl: new URL("./", import.meta.url),
  importMapFiles: {
    "./test.importmap": {
      initialImportMap: {
        imports: {
          "#env": "./env.js",
        },
      },
    },
  },
})
```

## mappingsForNodeResolution

When _mappingsForNodeResolution_ is enabled, the mappings required to implement node module resolution are generated.
The following source of information are used to create complete and coherent mappings in the importmap.

- Your _package.json_
- All dependencies declared in _package.json_ are searched into _node_modules_, recursively.
- In every _package.json_, `"main"`, `"exports"` and `"imports"` field.

> Be sure node modules are on your filesystem because we'll use the filesystem structure to generate the importmap. For that reason, you must use it after `npm install` or anything that is responsible to generate the node_modules folder and its content on your filesystem.

## mappingsForDevDependencies

When enabled, `"devDependencies"` declared in your _package.json_ are included in the generated importMap.

## checkImportResolution

_checkImportResolution_ is a boolean parameter controlling if script tries to resolve all import found in your js files using the importmap.

It is recommended to enable this parameter, it gives more confidence in the generated importmap and outputs nice logs for for imports that cannot be resolved.

This import resolution is auto enabled when [removeUnusedMappings](#removeUnusedMappings) or [extensionlessAutomapping](#extensionlessAutomapping) are used.

## removeUnusedMappings

_removeUnusedMappings_ parameter is a boolean controlling if mappings will be treeshaked according to the import found in your files.

During development, you can start or stop using a mapping often so it's convenient to have all mappings.

In production you likely want to keep only the mappings actually used by your js files. In that case enable removeUnusedMappings: it will drastically decrease the importmap file size.

## runtime

A string parameter indicating where the importmap will be used. The default runtime is `"browser"`.
The runtime is used to determine what to pick in [package.json conditions](https://nodejs.org/docs/latest-v16.x/api/packages.html#packages_conditions_definitions).

```js
import { writeImportMapFiles } from "@jsenv/importmap-node-module"

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
})
```

## packageUserConditions

Controls which conditions are favored in [package.json conditions](https://nodejs.org/dist/latest-v15.x/docs/api/packages.html#packages_conditions_definitions).

```js
import { writeImportMapFiles } from "@jsenv/importmap-node-module"

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
})
```

## extensionlessAutomapping

_extensionlessAutomapping_ parameter is a boolean controlling if mappings are generated for import(s) without extension found in your js files. Should be combined with _magicExtensions_ as shown in the code below.

```js
import { writeImportMapFiles } from "@jsenv/importmap-node-module"

await writeImportMapFiles({
  projectDirectoryUrl: new URL("./", import.meta.url),
  importMapFiles: {
    "./test.importmap": {
      extensionlessAutomapping: true,
      magicExtensions: [".ts", ".tsx"],
    },
  },
})
```

# Custom node module resolution

`@jsenv/importmap-node-module` uses a custom node module resolution

It behaves as Node.js with one big change:

**A node module will not be found if it is outside your project directory.**

We do this because import map are used on the web where a file outside project directory cannot be reached.

In practice, it has no impact because node modules are inside your project directory. If they are not, ensure all your dependencies are in your `package.json` and re-run `npm install`.

# Extensionless import

If the code you wants to run contains one ore more extensionless path specifier, it will not be found by a browser (not even by Node.js).

_extensionless import example_

```js
import { foo } from "./file"
```

In this situation, you can do one of the following:

1. Add extension in the source file
2. If there is a build step, ensure extension are added during the build
3. Add remapping in `exports` field of your `package.json`

   ```json
   {
     "exports": {
       "./file": "./file.js"
     }
   }
   ```

   Or using [Subpath patterns](https://nodejs.org/docs/latest-v16.x/api/packages.html#packages_subpath_patterns)

   ```json
   {
     "exports": {
       "./*": "./*.js"
     }
   }
   ```

4. Remap manually each extensionless import and pass that importmap in [initialImportMap](#initialImportMap)

# Configure VSCode and ESLint for importmap

VSCode and ESLint can be configured to understand importmap.
This will make ESLint and VSCode capable to resolve your imports.
Amongst other things it will give you the following:

- ESLint tells your when an import file cannot be found (help to fix typo)
- ESLint tells your when a named import does not exists in an imported file (help to fix typo too)
- VSCode "go to definition" opens the imported file (cmd + click too)
- VSCode autocompletion is improved because it can read imported files

The animated image below shows how configuring ESLint and VSCode helps to fix an import with a typo and navigate to an imported file.
This example uses `"demo/log.js"` import that is remapped to `"src/log.js"`.

![Animated image showing importmap integration in VSCode and ESLint](./docs/importmap_configured_demo.gif)

To configure VSCode, set `useForJsConfigJSON: true`.
It will update a file used by VSCode to resolve import: [jsconfig.json](https://code.visualstudio.com/docs/languages/jsconfig).

_jsConfigFile code example_

```diff
import { writeImportMapFiles } from "@jsenv/importmap-node-module"

await writeImportMapFiles({
  projectDirectoryUrl: new URL("./", import.meta.url),
  importMapFiles: {
    "./project.importmap": {
      initialImportMap: {
        imports: {
          "src/": "./src/",
        }
      },
+     useForJsConfigJSON: true
    },
  },
})
```

Code above would result into the following _jsconfig.json_ file

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "src/*": ["./src/*"]
    }
  }
}
```

At this stage, VSCode is configured to understand import mappings. It means "Go to definition" is working and allow you to navigate in your codebase using <kbd>cmd</kbd> + `click` keyboard shortcut.

If you also want to configure ESLint to resolve import using importmap, follow steps described in [@jsenv/importmap-eslint-resolver](https://github.com/jsenv/importmap-eslint-resolver#installation)
