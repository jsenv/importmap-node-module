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
    "test.importmap": {
      importResolution: {
        entryPoints: ["./index.js"],
      },
    },
  },
});
importmapFileSnapshot.compare();

const importmap = JSON.parse(readFileSync(importmapFileUrl, "utf8"));
const importMapNormalized = normalizeImportMap(importmap, "http://example.com");
const actual = {
  // import 'bar' inside project
  bar_inside_project: resolveImport({
    specifier: "bar",
    importer: "http://example.com/shared.js",
    importMap: importMapNormalized,
  }),
  // import 'bar' inside foo
  bar_inside_foo: resolveImport({
    specifier: "bar",
    importer: "http://example.com/node_modules/foo/foo.js",
    importMap: importMapNormalized,
  }),
  // import '/node_modules/bar/bar.js' inside foo
  node_modules_bar_inside_foo: resolveImport({
    specifier: "http://example.com/node_modules/foo/node_modules/bar/bar.js",
    importer: "http://example.com/node_modules/foo/foo.js",
    importMap: importMapNormalized,
  }),
  // import 'foo' inside project
  foo_inside_project: resolveImport({
    specifier: "foo",
    importer: "http://example.com/shared.js",
    importMap: importMapNormalized,
  }),
  // import '/node_modules/foo/foo.js' inside bar
  node_modules_foo_inside_bar: resolveImport({
    specifier: "http://example.com/node_modules/bar/node_modules/foo/foo.js",
    importer: "http://example.com/node_modules/bar/bar.js",
    importMap: importMapNormalized,
  }),
};
const expect = {
  bar_inside_project: "http://example.com/node_modules/bar/bar.js",
  bar_inside_foo: "http://example.com/node_modules/bar/bar.js",
  node_modules_bar_inside_foo:
    "http://example.com/node_modules/foo/node_modules/bar/bar.js",
  foo_inside_project: "http://example.com/node_modules/foo/foo.js",
  // there is no remapping because package.json does not specify
  // a dependency
  node_modules_foo_inside_bar:
    "http://example.com/node_modules/bar/node_modules/foo/foo.js",
};
assert({ actual, expect });
