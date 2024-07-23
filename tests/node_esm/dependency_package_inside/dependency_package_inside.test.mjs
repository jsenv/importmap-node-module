import { assert } from "@jsenv/assert";
import { normalizeImportMap, resolveImport } from "@jsenv/importmap";
import { takeFileSnapshot } from "@jsenv/snapshot";
import { readFileSync } from "node:fs";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const importmapFileUrl = new URL("./root/test.importmap", import.meta.url);
const importmapFileSnapshot = takeFileSnapshot(importmapFileUrl);
await writeImportmaps({
  logLevel: "warn",
  directoryUrl: testDirectoryUrl,
  importmaps: {
    "test.importmap": {},
  },
});
importmapFileSnapshot.compare();

const importmap = JSON.parse(readFileSync(importmapFileUrl, "utf8"));
const importMapNormalized = normalizeImportMap(importmap, "http://example.com");

const actual = {
  // import 'bar' inside project
  bar_inside_project: resolveImport({
    specifier: `bar`,
    importer: `http://example.com/scoped.js`,
    importMap: importMapNormalized,
  }),
  // import 'bar' inside foo
  bar_inside_foo: resolveImport({
    specifier: `bar`,
    importer: `http://example.com/node_modules/foo/foo.js`,
    importMap: importMapNormalized,
  }),
  // import 'bar/file.js' inside 'bar'
  bar_file_inside_bar: resolveImport({
    specifier: `bar/file.js`,
    importer: `http://example.com/node_modules/foo/node_modules/bar/bar.js`,
    importMap: importMapNormalized,
  }),
};
const expect = {
  bar_inside_project: `http://example.com/node_modules/bar/bar.js`,
  bar_inside_foo: `http://example.com/node_modules/foo/node_modules/bar/bar.js`,
  bar_file_inside_bar: `http://example.com/node_modules/foo/node_modules/bar/file.js`,
};
assert({ actual, expect });
