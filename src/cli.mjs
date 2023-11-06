#!/usr/bin/env node

import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { writeImportMapFiles } from "./main.js";

const options = {
  "help": {
    type: "boolean",
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
values.entrypoint ??= [];

if (values.help || positionals.length === 0) {
  usage();
  process.exit(0);
}

if (positionals.length > 2) {
  console.error("Error: too many inputs.");
  process.exit(1);
}

if (values["remove-unused"] && values.entrypoint.length === 0) {
  console.error("Error: --remove-unused requires at least one --entrypoint.");
  process.exit(1);
}

let indir = positionals.length === 2 ? positionals[0] : ".";
let outfile = positionals.length === 2 ? positionals[1] : positionals[0];

await writeImportMapFiles({
  projectDirectoryUrl: new URL(indir, pathToFileURL(`${process.cwd()}/`)),
  importMapFiles: {
    [outfile]: {
      mappingsForNodeResolution: true,
      mappingsForDevDependencies: values["include-dev"],
      entryPointsToCheck: values.entrypoint,
      removeUnusedMappings: values["remove-unused"],
    },
  },
});

function usage() {
  console.log(`importmap-node-module: Generate import maps for node's esm resolution algorithm.

Usage: npx @jsenv/importmap-node-module [options] [root-directory] output.importmap

https://github.com/jsenv/importmap-node-module

Options:
  --help                  Display this message.
  --include-dev           Include devDependencies from package.json.
  --entrypoint file.js    Confirm the specified file and its transitive dependencies can be resolved using the generated import map. Can be specified multiple times.
  --remove-unused         Remove mappings not used by any entrypoint or their transitive dependencies. Requires --entrypoint.

For more advanced options, see the API.`);
}
