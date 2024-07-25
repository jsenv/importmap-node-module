import { snapshotFunctionSideEffects } from "@jsenv/snapshot";

export const snapshotWriteImportsMapsSideEffects = async (
  fn,
  fnFileUrl,
  sideEffectDirectoryRelativeUrl,
  options,
) => {
  await snapshotFunctionSideEffects(
    fn,
    fnFileUrl,
    sideEffectDirectoryRelativeUrl,
    options,
  );
};
