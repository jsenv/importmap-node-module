#!/usr/bin/env node

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
};
const { values, positionals } = parseArgs({ options, allowPositionals: true });
const outfile = positionals[0];
values.entrypoint ??= [];

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

const currentDirectoryUrl = pathToFileURL(`${process.cwd()}/`);
await writeImportmaps({
  directoryUrl: new URL(values.dir || ".", currentDirectoryUrl),
  importmaps: {
    [outfile]: {
      nodeMappings: {
        devDependencies: values.dev,
        packageUserConditions: values.dev ? ["development"] : [],
      },
      importResolution: {
        entryPoints: values.entryPoints,
      },
      keepUnusedMappings: values["keep-unused"],
    },
  },
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

For more advanced options, see the API.`);
}
