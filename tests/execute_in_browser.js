import { markAsInternalError } from "@jsenv/exception";
import { chromium } from "playwright";

export const executeInBrowser = async (
  url,
  {
    browserLauncher = chromium,
    headScriptUrl,
    /* eslint-disable no-undef */
    pageFunction = () => window.resultPromise,
    /* eslint-enable no-undef */
    pageArguments = [],
    collectConsole = false,
    collectErrors = false,
    mirrorConsole = false,
    debug = false,
    headless = !debug,
    autoStop = !debug,
  } = {},
) => {
  const browser = await browserLauncher.launch({ headless });
  const browserName = browser._name;
  const page = await browser.newPage({ ignoreHTTPSErrors: true });
  const consoleOutput = {
    raw: "",
    logs: [],
    debugs: [],
    warnings: [],
    errors: [],
    infos: [],
  };

  const logTypes = {
    log: consoleOutput.logs,
    debug: consoleOutput.debugs,
    info: consoleOutput.infos,
    warning: consoleOutput.warnings,
    error: consoleOutput.errors,
  };
  const consoleCallback = (message) => {
    const type = message.type();
    if (collectConsole) {
      const text = message.text();
      logTypes[type].push(text);
      consoleOutput.raw += text;
    } else if (mirrorConsole) {
      console[type === "warning" ? "warn" : type](
        `${browserName} console.${type} > ${message.text()}`,
      );
    } else if (type === "error") {
      console.error(message.text());
    }
  };
  page.on("console", consoleCallback);

  const pageErrors = [];
  if (collectErrors) {
    page.on("pageerror", (error) => {
      pageErrors.push(error);
    });
  }
  const result = {
    returnValue: undefined,
    pageErrors,
    consoleOutput,
  };

  const errorPromise = collectErrors
    ? new Promise(() => {})
    : new Promise((resolve, reject) => {
        const errorCallback = (error) => {
          page.off("pageerror", errorCallback);
          page.on("pageerror", (error) => {
            throw error;
          });
          reject(
            markAsInternalError(
              new Error(`${browserName} "pageerror"`, { cause: error }),
            ),
          );
        };
        page.on("pageerror", errorCallback);
      });

  const resultPromise = (async () => {
    await page.goto(url);
    if (headScriptUrl) {
      // https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pageaddscripttagoptions
      await page.addScriptTag({ url: headScriptUrl });
    }
    const returnValue = await page.evaluate(pageFunction, ...pageArguments);
    result.returnValue = returnValue;
  })();

  let isClosing = false;
  try {
    await Promise.race([
      errorPromise,
      resultPromise.catch((e) => {
        if (isClosing) {
          return null;
        }
        return Promise.reject(e);
      }),
    ]);
    return result;
  } finally {
    page.off("console", consoleCallback);
    if (autoStop) {
      isClosing = true;
      await closeBrowser(browser);
    }
  }
};

const closeBrowser = async (browser) => {
  const disconnected = browser.isConnected()
    ? new Promise((resolve) => {
        const disconnectedCallback = () => {
          browser.removeListener("disconnected", disconnectedCallback);
          resolve();
        };
        browser.on("disconnected", disconnectedCallback);
      })
    : Promise.resolve();
  // for some reason without this timeout
  // browser.close() never resolves (playwright does not like something)
  await new Promise((resolve) => setTimeout(resolve, 50));
  try {
    await browser.close();
  } catch (e) {
    if (isTargetClosedError(e)) {
      return;
    }
    throw e;
  }
  await disconnected;
};

const isTargetClosedError = (error) => {
  if (error.message.match(/Protocol error \(.*?\): Target closed/)) {
    return true;
  }
  if (error.message.match(/Protocol error \(.*?\): Browser.*?closed/)) {
    return true;
  }
  return error.message.includes("browserContext.close: Browser closed");
};
