import { snapshotFunctionSideEffects } from "@jsenv/snapshot";

export const snapshotWriteImportsMapsSideEffects = async (
  fn,
  fnFileUrl,
  sideEffectDirectoryRelativeUrl,
) => {
  await snapshotFunctionSideEffects(
    fn,
    fnFileUrl,
    sideEffectDirectoryRelativeUrl,
  );
};
