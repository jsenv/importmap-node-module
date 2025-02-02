import { snapshotSideEffects } from "@jsenv/snapshot";

export const snapshotWriteImportsMapsSideEffects = async (
  fn,
  fnFileUrl,
  options = {},
) => {
  await snapshotSideEffects(fnFileUrl, fn, {
    ...options,
    filesystemEffects: {
      baseDirectory: new URL("./", fnFileUrl),
      ...options.filesystemEffects,
    },
  });
};
