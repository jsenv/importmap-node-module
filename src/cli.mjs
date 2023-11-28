#!/usr/bin/env node

import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { writeImportmaps } from "./main.js";

const options = {
  "help": {
    type: "boolean",
  },
  "dir": {
    type: "string",
  },
  "include-dev": {
    type: "boolean",
  },
  "entrypoint": {
    type: "string",
    multiple: true,
  },
  "remove-unused": {
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

if (values["remove-unused"] && values.entrypoint.length === 0) {
  if (outfile.endsWith(".html")) {
    values.entrypoint.push(outfile);
  } else {
    console.error("Error: --remove-unused requires at least one --entrypoint.");
    process.exit(1);
  }
}

const currentDirectoryUrl = pathToFileURL(`${process.cwd()}/`);
await writeImportmaps({
  projectDirectoryUrl: new URL(values.dir || ".", currentDirectoryUrl),
  importmaps: {
    [outfile]: {
      mappingsForNodeResolution: true,
      mappingsForDevDependencies: values["include-dev"],
      entryPoints: values.entrypoint,
      removeUnusedMappings: values["remove-unused"],
    },
  },
});

function usage() {
  console.log(`importmap-node-module: Generate import maps for node's esm resolution algorithm.

Usage: npx @jsenv/importmap-node-module output.importmap [options]

https://github.com/jsenv/importmap-node-module

Options:
  --help                  Display this message.
  --dir                   Files will be resolved against this directory. Defaults to process.cwd()
  --include-dev           Include devDependencies from package.json.
  --entrypoint file.js    Confirm the specified file and its transitive dependencies can be resolved using the generated import map. Can be specified multiple times.
  --remove-unused         Remove mappings not used by any entrypoint or their transitive dependencies. Requires --entrypoint.

For more advanced options, see the API.`);
}
