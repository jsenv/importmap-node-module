# 7.0.0

- breaking: change params signature
  - `mappingsForNodeResolution`, `mappingsForDevDependencies` and `packageUserConditions` moves to `nodeMappings`
  - `entryPoints`, `runtime`, `magicExtensions` moves to `importResolution`
  - node mappings enabled by default
  - removeUnusedMappings enabled by default

**6.0.0**

```js
import { writeImportmaps } from "@jsenv/importmap-node-module";

await writeImportmaps({
  projectDirectoryUrl: new URL("./", import.meta.url),
  importmaps: {
    "demo.importmap": {
      mappingsForNodeResolution: true,
      mappingsForDevDependencies: true,
      runtime: "browser",
      packageUserConditions: ["browser"],
      entryPoints: ["index.html"],
      magicExtensions: [".js", "inherit"],
      removeUnusedMappings: true,
    },
  },
});
```

**7.0.0**

```js
import { writeImportmaps } from "@jsenv/importmap-node-module";

await writeImportmaps({
  projectDirectoryUrl: new URL("./", import.meta.url),
  importmaps: {
    "demo.importmap": {
      nodeMappings: {
        devDependencies: true,
        packageUserConditions: ["browser"],
      },
      importResolution: {
        runtime: "browser",
        entryPoints: ["index.html"],
        magicExtensions: [".js", "inherit"],
      },
    },
  },
});
```

# 6.0.0

- major: `writeImportMapFiles` function renamed `writeImportmaps`
- major: `importMapFiles` param renamed `importmaps`
- major: `entryPointsToCheck` param renamed `entryPoints`
- major: `manualImportMap` option renamed `manualImportmap`
- feat: Allow to write importmap into html files
- feat: warning when `bareSpecifierAutomapping` is used without `entryPoints`
- feat: allow to use options related to entry points without having to specify entry point when importmap is written to html. Both in CLI and API.
- feat: add --dir to CLI

# 5.5.0

- Add CLI

# 5.4.0

- Allow root package without names

# 5.3.0

- add `babelConfigFileUrl` param to `writeImportMapFiles`
- Enable many parser plugins by default such as import assertions
- Update dependencies
