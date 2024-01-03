import { readFileSync, writeFileSync } from "@jsenv/filesystem";
import { urlToFileSystemPath } from "@jsenv/urls";

export const updateJsConfigForVsCode = (
  importmapInfos,
  { logger, rootDirectoryUrl, jsConfigFileUrl, jsConfigDefault },
) => {
  for (const importmapRelativeUrl of Object.keys(importmapInfos)) {
    const importmapInfo = importmapInfos[importmapRelativeUrl];
    const { useForJsConfigJSON } = importmapInfo.options;
    if (!useForJsConfigJSON) {
      continue;
    }
    jsConfigFileUrl =
      jsConfigFileUrl || new URL("./jsconfig.json", rootDirectoryUrl);
    let jsConfigCurrent;
    try {
      jsConfigCurrent = readFileSync(jsConfigFileUrl, { as: "json" });
    } catch (e) {
      jsConfigCurrent = null;
    }
    jsConfigCurrent = jsConfigCurrent || { compilerOptions: {} };

    const jsConfigPaths = importmapToVsCodeConfigPaths(importmapInfo.importmap);
    const jsConfig = {
      ...jsConfigDefault,
      ...jsConfigCurrent,
      compilerOptions: {
        ...jsConfigDefault.compilerOptions,
        ...jsConfigCurrent.compilerOptions,
        // importmap is the source of truth -> paths are overwritten
        // We coudldn't differentiate which one we created and which one where added manually anyway
        paths: jsConfigPaths,
      },
    };
    writeFileSync(jsConfigFileUrl, JSON.stringify(jsConfig, null, "  "));
    logger.info(`-> ${urlToFileSystemPath(jsConfigFileUrl)}`);
  }
};

export const importmapToVsCodeConfigPaths = ({ imports = {} }) => {
  const paths = {};

  Object.keys(imports).forEach((importKey) => {
    const importValue = imports[importKey];

    let key;
    if (importKey.endsWith("/")) {
      key = `${importKey}*`;
    } else {
      key = importKey;
    }

    const importValueArray =
      typeof importValue === "string" ? [importValue] : importValue;
    const candidatesForPath = importValueArray.map((importValue) => {
      if (importValue.endsWith("/")) {
        return `${importValue}*`;
      }
      return importValue;
    });

    const existingPaths = paths[key];
    if (existingPaths) {
      paths[key] = [...existingPaths, ...candidatesForPath];
    } else {
      paths[key] = candidatesForPath;
    }
  });

  return paths;
};
