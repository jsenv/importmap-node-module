import { snapshotTests } from "@jsenv/snapshot";

export const snapshotWriteImportmaps = (
  url,
  fnRegisteringTests,
  options = {},
) => {
  return snapshotTests(url, fnRegisteringTests, {
    filesystemEffects: {
      textualFilesInline: true,
      ...options.filesystemEffects,
    },
    ...options,
  });
};
