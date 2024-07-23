import {
  replaceFluctuatingValues,
  takeDirectorySnapshot,
} from "@jsenv/snapshot";

import { moveEntrySync, writeFileSync } from "@jsenv/filesystem";
import { writeImportmaps } from "@jsenv/importmap-node-module";

const takeExecutionSnapshot = (
  fn,
  outputDirectoryUrl,
  { rootDirectoryUrl, captureConsole = true, filesystemRedirects } = {},
) => {
  const outputDirectorySnapshot = takeDirectorySnapshot(outputDirectoryUrl);
  const finallyCallbackSet = new Set();

  const errorFileUrl = new URL("./error.txt", import.meta.url);
  const resultFileUrl = new URL("./result.json", import.meta.url);
  const onError = (e) => {
    writeFileSync(
      errorFileUrl,
      replaceFluctuatingValues(e.stack, {
        fileUrl: errorFileUrl,
      }),
    );
  };
  const onResult = (result) => {
    if (result === undefined) {
      return;
    }
    writeFileSync(
      resultFileUrl,
      replaceFluctuatingValues(JSON.stringify(result, null, "  "), {
        fileUrl: resultFileUrl,
        rootDirectoryUrl,
      }),
    );
  };
  if (captureConsole) {
    const warningsFileUrl = new URL("./warnings.txt", import.meta.url);
    const { warn } = console;
    let warnings = "";
    console.warn = (message) => {
      if (warnings) {
        warnings += "\n";
      }
      warnings += message;
    };
    finallyCallbackSet.add(() => {
      console.warn = warn;
      if (warnings) {
        writeFileSync(
          warningsFileUrl,
          replaceFluctuatingValues(warnings, {
            fileUrl: warningsFileUrl,
            rootDirectoryUrl,
          }),
        );
      }
    });
  }
  if (filesystemRedirects) {
    for (const filesystemRedirect of filesystemRedirects) {
      finallyCallbackSet.add(() => {
        {
          moveEntrySync({
            from: filesystemRedirect.from,
            to: filesystemRedirect.into,
            noEntryEffect: "none",
          });
        }
      });
    }
  }
  try {
    const returnValue = fn();
    if (returnValue && returnValue.then) {
      returnValue.then(
        (value) => {
          onResult(value);
        },
        (e) => {
          onError(e);
        },
      );
    } else {
      onResult(returnValue);
    }
  } catch (e) {
    onError(e);
  } finally {
    for (const finallyCallback of finallyCallbackSet) {
      finallyCallback();
    }
    outputDirectorySnapshot.compare();
  }
};

const test = async (scenario, { bareSpecifierAutomapping }) => {
  await takeExecutionSnapshot(
    async () => {
      await writeImportmaps({
        logLevel: "warn",
        directoryUrl: new URL("./input/", import.meta.url),
        importmaps: {
          [`${scenario}.importmap`]: {
            importResolution: {
              entryPoints: ["./index.js"],
              bareSpecifierAutomapping,
            },
          },
        },
      });
    },
    new URL(`./output/${scenario}/`, import.meta.url),
    {
      filesystemRedirects: [
        {
          from: new URL(`./input/${scenario}.importmap`, import.meta.url),
          into: new URL(`./output/${scenario}.importmap`, import.meta.url),
        },
      ],
    },
  );
};

await test("default", {});
await test("bare_specifier_automapping", { bareSpecifierAutomapping: true });
