import {
  createHtmlNode,
  findHtmlNode,
  getHtmlNodeAttribute,
  injectHtmlNodeAsEarlyAsPossible,
  parseHtml,
  setHtmlNodeAttributes,
  setHtmlNodeText,
  stringifyHtmlAst,
} from "@jsenv/ast";
import { readFileSync, writeFileSync } from "@jsenv/filesystem";
import { urlToFileSystemPath } from "@jsenv/urls";

export const writeIntoFiles = (
  importmapInfos,
  { logger, rootDirectoryUrl },
) => {
  for (const importmapRelativeUrl of Object.keys(importmapInfos)) {
    const importmapInfo = importmapInfos[importmapRelativeUrl];
    const importmap = importmapInfo.importmap;
    const fileUrl = new URL(importmapRelativeUrl, rootDirectoryUrl).href;
    const importmapAsJson = JSON.stringify(importmap, null, "  ");
    if (fileUrl.endsWith(".html")) {
      writeIntoHtmlFile(fileUrl, importmapAsJson, { logger });
    } else if (fileUrl.endsWith(".js")) {
      writeInfoJsFile(fileUrl, importmapAsJson, { logger });
    } else {
      writeIntoJsonFile(fileUrl, importmapAsJson, { logger });
    }
  }
};

const writeIntoJsonFile = (jsonFileUrl, importmapAsJson, { logger }) => {
  writeFileSync(jsonFileUrl, importmapAsJson);
  logger.info(`-> ${urlToFileSystemPath(jsonFileUrl)}`);
};

const writeIntoHtmlFile = (htmlFileUrl, importmapAsJson, { logger }) => {
  const htmlAst = parseHtml({
    html: readFileSync(htmlFileUrl, { as: "string" }),
    url: htmlFileUrl,
    storeOriginalPositions: false,
  });
  const scriptTypeImportmap = findHtmlNode(htmlAst, (node) => {
    if (node.nodeName !== "script") {
      return false;
    }
    const typeAttribute = getHtmlNodeAttribute(node, "type");
    return typeAttribute === "importmap";
  });

  if (scriptTypeImportmap) {
    const srcAttribute = getHtmlNodeAttribute(scriptTypeImportmap, "src");
    if (srcAttribute) {
      setHtmlNodeAttributes(scriptTypeImportmap, { src: undefined });
      logger.warn(`remove src=${srcAttribute} from <script type="module">`);
    }
    setHtmlNodeText(scriptTypeImportmap, importmapAsJson, {
      indentation: "auto",
    });
    setHtmlNodeAttributes(scriptTypeImportmap, {
      "content-indented": undefined,
    });
    logger.info(
      `<script type="importmap"> content updated into "${urlToFileSystemPath(
        htmlFileUrl,
      )}"`,
    );
  } else {
    const importmapNode = createHtmlNode({
      tagName: "script",
      type: "importmap",
      children: importmapAsJson,
    });
    injectHtmlNodeAsEarlyAsPossible(htmlAst, importmapNode);
    setHtmlNodeAttributes(importmapNode, {
      "jsenv-injected-by": "@jsenv/importmap-node-module",
      "content-indented": undefined,
    });
    logger.info(
      `<script type="importmap"> injected into "${urlToFileSystemPath(
        htmlFileUrl,
      )}"`,
    );
  }
  const html = stringifyHtmlAst(htmlAst);
  writeFileSync(new URL(htmlFileUrl), html);
};

const writeInfoJsFile = (jsFileUrl, importmapAsJson, { logger }) => {
  const jsFileContent = `
const currentScript = document.currentScript;
if (!currentScript) {
  throw new Error(
    "document.currentScript is not available, cannot inject importmap"
  );
}
const baseUrl = new URL(".", currentScript.src).href;
const importmap = ${importmapAsJson};
const topLevelMappings = importmap.imports;
const scopedMappings = importmap.scopes;
const makeMappingsAbsolute = () => {
  for (const key of Object.keys(mappings)) {
    mappings[key] = baseUrl + mappings[key];
  }
}
if (topLevelMappings) {
  makeMappingsAbsolute(topLevelMappings);
}
if (scopedMappings) {
  for (const scope of Object.keys(scopedMappings)) {
    const mappings = scopedMappings[scope];
    makeMappingsAbsolute(mappings);
  }
}
const importmapScript = document.createElement("script");
importmapScript.type = "importmap";
importmapScript.textContent = importmap;
currentScript.after(importmapScript);
`;
  writeFileSync(jsFileUrl, jsFileContent);
  logger.info(`-> ${urlToFileSystemPath(jsFileUrl)}`);
};
