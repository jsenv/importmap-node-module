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

![Animated image showing importmap integration in VSCode and ESLint](./importmap_configured_demo.gif)

To configure VSCode, set `useForJsConfigJSON: true`.
It will update a file used by VSCode to resolve import: [jsconfig.json](https://code.visualstudio.com/docs/languages/jsconfig).

_jsConfigFile code example_

```diff
import { writeImportmaps } from "@jsenv/importmap-node-module"

await writeImportmaps({
  directoryUrl: new URL("./", import.meta.url),
  importmaps: {
    "./project.importmap": {
      manualImportmap: {
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
