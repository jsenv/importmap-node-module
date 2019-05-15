import { isCancelError } from "@dmail/cancellation"

export const catchAsyncFunctionCancellation = (asyncFunction) => {
  return asyncFunction().catch((error) => {
    if (isCancelError(error)) return
    throw error
  })
}
