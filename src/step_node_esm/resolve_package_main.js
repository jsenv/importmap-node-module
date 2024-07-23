import { createDetailedMessage } from "@jsenv/logger";
import { resolveUrl, urlToFileSystemPath, urlToRelativeUrl } from "@jsenv/urls";

import {
  createBrowserFieldNotImplementedWarning,
  createPreferExportsFieldWarning,
} from "../util/logs.js";
import { resolveFile } from "../util/resolve_file.js";

export const resolvePackageMain = async ({
  logger,
  warn,
  exportsFieldSeverity = "warn",
  packageInfo,
  packageConditions,
}) => {
  const packageDirectoryUrl = resolveUrl("./", packageInfo.url);
  const packageEntryFieldName = decidePackageEntryFieldName({
    logger,
    warn,
    exportsFieldSeverity,
    packageConditions,
    packageInfo,
  });
  return tryToResolvePackageEntryFile({
    packageEntryFieldName,
    packageDirectoryUrl,
    packageInfo,
  });
};

const decidePackageEntryFieldName = ({
  logger,
  warn,
  exportsFieldSeverity,
  packageConditions,
  packageInfo,
}) => {
  let nonStandardFieldFound;
  packageConditions.find((condition) => {
    if (condition === "import") {
      const moduleFieldValue = packageInfo.object.module;
      if (typeof moduleFieldValue === "string") {
        nonStandardFieldFound = "module";
        return true;
      }
      const jsNextFieldValue = packageInfo.object["jsnext:main"];
      if (typeof jsNextFieldValue === "string") {
        nonStandardFieldFound = "jsnext:main";
        return true;
      }
      return false;
    }
    if (condition === "browser") {
      const browserFieldValue = packageInfo.object.browser;
      if (typeof browserFieldValue === "string") {
        nonStandardFieldFound = "browser";
        return true;
      }
      if (typeof browserFieldValue === "object") {
        // the browser field can be an object, for now it's not supported
        // see https://github.com/defunctzombie/package-browser-field-spec
        // as a workaround it's possible to use "packageManualOverrides"
        const browserFieldWarning = createBrowserFieldNotImplementedWarning({
          packageInfo,
        });
        if (exportsFieldSeverity === "warn") {
          warn(browserFieldWarning);
        } else {
          logger.debug(browserFieldWarning.message);
        }
        return false;
      }

      return false;
    }
    return false;
  });
  if (nonStandardFieldFound) {
    const exportsFieldWarning = createPreferExportsFieldWarning({
      packageInfo,
      packageEntryFieldName: nonStandardFieldFound,
    });
    if (exportsFieldSeverity === "warn") {
      warn(exportsFieldWarning);
    } else {
      logger.debug(exportsFieldWarning.message);
    }
    return nonStandardFieldFound;
  }
  return "main";
};

const tryToResolvePackageEntryFile = async ({
  packageEntryFieldName,
  packageDirectoryUrl,
  packageInfo,
}) => {
  const packageEntrySpecifier = packageInfo.object[packageEntryFieldName];
  // explicitely empty meaning
  // it is assumed that we should not find a file
  if (packageEntrySpecifier === "") {
    return { found: false, packageEntryFieldName };
  }

  const relativeUrlToTry = packageEntrySpecifier
    ? packageEntrySpecifier.endsWith("/")
      ? `${packageEntrySpecifier}index`
      : packageEntrySpecifier
    : "./index";

  const urlFirstCandidate = resolveUrl(relativeUrlToTry, packageDirectoryUrl);

  if (!urlFirstCandidate.startsWith(packageDirectoryUrl)) {
    return {
      found: false,
      packageEntryFieldName,
      warning: createPackageEntryMustBeRelativeWarning({
        packageEntryFieldName,
        packageInfo,
      }),
    };
  }

  const extensionsToTry = [".js", ".json", ".node"];
  const { found, url } = await resolveFile(urlFirstCandidate, {
    magicDirectoryIndexEnabled: true,
    magicExtensionEnabled: true,
    extensionsToTry,
  });

  if (!found) {
    const warning = createPackageEntryNotFoundWarning({
      packageEntryFieldName,
      packageInfo,
      fileUrl: urlFirstCandidate,
      extensionsTried: extensionsToTry,
    });

    return {
      found: false,
      packageEntryFieldName,
      relativeUrl: urlToRelativeUrl(urlFirstCandidate, packageInfo.url),
      warning,
    };
  }

  return {
    found: true,
    packageEntryFieldName,
    relativeUrl: urlToRelativeUrl(url, packageInfo.url),
  };
};

const createPackageEntryMustBeRelativeWarning = ({
  packageEntryFieldName,
  packageInfo,
}) => {
  return {
    code: "PACKAGE_ENTRY_MUST_BE_RELATIVE",
    message: createDetailedMessage(
      `"${packageEntryFieldName}" field in package.json must be inside package.json directory`,
      {
        [packageEntryFieldName]: packageInfo.object[packageEntryFieldName],
        "package.json path": urlToFileSystemPath(packageInfo.url),
      },
    ),
  };
};

const createPackageEntryNotFoundWarning = ({
  packageEntryFieldName,
  packageInfo,
  fileUrl,
  extensionsTried,
}) => {
  return {
    code: "PACKAGE_ENTRY_NOT_FOUND",
    message: createDetailedMessage(
      `File not found for package.json "${packageEntryFieldName}" field`,
      {
        [packageEntryFieldName]: packageInfo.object[packageEntryFieldName],
        "package.json path": urlToFileSystemPath(packageInfo.url),
        "url tried": urlToFileSystemPath(fileUrl),
        ...(extensionsTried.length > 0
          ? { ["extensions tried"]: extensionsTried.join(`, `) }
          : {}),
      },
    ),
  };
};
