import { assert } from "@jsenv/assert";
import { ensureEmptyDirectory, readFile, writeFile } from "@jsenv/filesystem";

import { parseSpecifiersFromJs } from "@jsenv/importmap-node-module/src/step_entry_point/js_parser.js";

const testDirectoryUrl = new URL("./fixtures/", import.meta.url);
const fileUrl = new URL("test.js", testDirectoryUrl);

// static top level import
{
  await writeFile(
    fileUrl,
    `import "./foo"
import "./bar.js"
`,
  );
  const specifiers = await parseSpecifiersFromJs({
    code: await readFile(fileUrl, { as: "string" }),
    url: fileUrl,
  });
  const actual = specifiers;
  const expect = {
    "./foo": {
      line: 1,
      column: 7,
      type: "import-static",
    },
    "./bar.js": {
      line: 2,
      column: 7,
      type: "import-static",
    },
  };
  assert({ actual, expect });
  await ensureEmptyDirectory(testDirectoryUrl);
}

// dynamic top level import
{
  await writeFile(
    fileUrl,
    `import("./foo")
import(id)
`,
  );
  const specifiers = await parseSpecifiersFromJs({
    code: await readFile(fileUrl, { as: "string" }),
    url: fileUrl,
  });
  const actual = specifiers;
  const expect = {
    "./foo": {
      line: 1,
      column: 7,
      type: "import-dynamic",
    },
  };
  assert({ actual, expect });
  await ensureEmptyDirectory(testDirectoryUrl);
}

// export from named
{
  await writeFile(fileUrl, `export {toto} from "./foo"`);
  const specifiers = await parseSpecifiersFromJs({
    code: await readFile(fileUrl, { as: "string" }),
    url: fileUrl,
  });
  const actual = specifiers;
  const expect = {
    "./foo": {
      line: 1,
      column: 19,
      type: "export-named",
    },
  };
  assert({ actual, expect });
  await ensureEmptyDirectory(testDirectoryUrl);
}

// export from all
{
  await writeFile(fileUrl, `export * from "./foo"`);
  const specifiers = await parseSpecifiersFromJs({
    code: await readFile(fileUrl, { as: "string" }),
    url: fileUrl,
  });
  const actual = specifiers;
  const expect = {
    "./foo": {
      line: 1,
      column: 14,
      type: "export-all",
    },
  };
  assert({ actual, expect });
  await ensureEmptyDirectory(testDirectoryUrl);
}
