#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { writeImportmaps } from "./main.js";

const options = {
  "help": {
    type: "boolean",
  },
  "dir": {
    type: "string",
  },
  "entrypoint": {
    type: "string",
    multiple: true,
  },
  "dev": {
    type: "boolean",
  },
  "keep-unused": {
    type: "boolean",
  },
  "config": {
    type: "string",
  },
};
const { values, positionals } = parseArgs({ options, allowPositionals: true });
const outfile = positionals[0];

if (values.help || positionals.length === 0) {
  usage();
  process.exit(0);
}

if (positionals.length > 1) {
  console.error("Error: too many inputs.");
  process.exit(1);
}

if (
  !outfile.endsWith(".html") &&
  !outfile.endsWith(".importmap") &&
  !outfile.endsWith(".json") &&
  !outfile.endsWith(".js")
) {
  console.error("Error: outfile must end with .html, .importmap, .json or .js");
  process.exit(1);
}

const config = values.config ? JSON.parse(await readFile(values.config, "utf-8")) : {};
const dev = values.dev ?? config.dev;

const currentDirectoryUrl = pathToFileURL(`${process.cwd()}/`);
await writeImportmaps({
  directoryUrl: new URL(values.dir ?? config.dir ?? ".", currentDirectoryUrl),
  importmaps: {
    [outfile]: {
      nodeMappings: {
        devDependencies: dev,
        packageUserConditions: dev ? ["development"] : [],
      },
      importResolution: {
        entryPoints: values.entrypoint ?? config.entryPoints ?? [],
      },
      keepUnusedMappings: values["keep-unused"] ?? config.keepUnused,
      manualImportmap: config.manualImportmap,
    },
  },
  packagesManualOverrides: config.packagesManualOverrides,
});

function usage() {
  console.log(`importmap-node-module: Generate import maps for node's esm resolution algorithm.

Usage: npx @jsenv/importmap-node-module file.html [options]

https://github.com/jsenv/importmap-node-module

Options:
  --help               Display this message.
  --dir                Files will be resolved against this directory. Defaults to process.cwd()
  --entrypoint file.js Confirm the specified file and its transitive dependencies can be resolved using the generated import map. Can be specified multiple times.
  --dev                Include devDependencies from package.json and pick "developement" in package conditions.
  --keep-unused        Remove mappings not used by any entrypoint or their transitive dependencies. Requires --entrypoint.
  --config config.json Read additional settings from the given JSON configuration file.

For more advanced options, see the API.`);
}
