import { writeImportmaps } from "@jsenv/importmap-node-module";
import { snapshotFunctionSideEffects } from "@jsenv/snapshot";

const test = async (scenario, { magicExtensions } = {}) => {
  await snapshotFunctionSideEffects(
    () =>
      writeImportmaps({
        logLevel: "warn",
        directoryUrl: new URL("./input/", import.meta.url),
        importmaps: {
          "test.importmap": {
            importResolution: {
              entryPoints: ["./main.js"],
              magicExtensions,
            },
          },
        },
      }),
    import.meta.url,
    `./output/${scenario}/`,
    {
      filesystemEffects: [`./input/test.importmap`],
      restoreFilesystem: true,
      filesystemEffectsInline: true,
    },
  );
};

await test("0_default", {
  magicExtensions: undefined,
});
await test("1_magic_extensions_js", {
  magicExtensions: [".js"],
});
await test("2_magic_extensions_inherit", {
  magicExtensions: ["inherit", ".ts"],
});
