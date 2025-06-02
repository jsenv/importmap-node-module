import { executeInBrowser } from "./execute_in_browser.js";

export const executeHtml = async (
  htmlUrl,
  {
    /* eslint-disable no-undef */
    pageFunction = () => window.resultPromise,
    /* eslint-enable no-undef */
    pageFunctionArg = undefined,
    ...options
  } = {},
) => {
  const { returnValue } = await executeInBrowser(htmlUrl, {
    pageFunction,
    pageArguments: [pageFunctionArg],
    mirrorConsole: true,
    ...options,
  });
  return returnValue;
};
