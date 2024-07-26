import { snapshotFunctionSideEffects } from "@jsenv/snapshot";

export const snapshotWriteImportsMapsSideEffects = async (
  fn,
  fnFileUrl,
  sideEffectFileRelativeUrl,
  options = {},
) => {
  await snapshotFunctionSideEffects(
    fn,
    new URL(sideEffectFileRelativeUrl, fnFileUrl),
    {
      ...options,
      filesystemEffects: {
        baseDirectory: new URL("./", fnFileUrl),
        ...options.filesystemEffects,
      },
    },
  );
};
