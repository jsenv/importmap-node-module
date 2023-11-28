import { readFileSync, writeFileSync } from "@jsenv/filesystem";
import { urlToFileSystemPath } from "@jsenv/urls";
import {
  parseHtml,
  findHtmlNode,
  getHtmlNodeAttribute,
  setHtmlNodeAttributes,
  setHtmlNodeText,
  createHtmlNode,
  injectHtmlNodeAsEarlyAsPossible,
  stringifyHtmlAst,
} from "@jsenv/ast";

export const writeIntoFiles = (
  importmapInfos,
  { logger, projectDirectoryUrl },
) => {
  for (const importmapRelativeUrl of Object.keys(importmapInfos)) {
    const importmapInfo = importmapInfos[importmapRelativeUrl];
    const importmap = importmapInfo.importmap;
    const fileUrl = new URL(importmapRelativeUrl, projectDirectoryUrl).href;
    const importmapAsJson = JSON.stringify(importmap, null, "  ");
    if (fileUrl.endsWith(".html")) {
      writeIntoHtmlFile(fileUrl, importmapAsJson, { logger });
    } else {
      writeFileSync(fileUrl, importmapAsJson);
      logger.info(`-> ${urlToFileSystemPath(fileUrl)}`);
    }
  }
};

const writeIntoHtmlFile = (htmlFileUrl, importmapAsJson, { logger }) => {
  const htmlAst = parseHtml({
    html: readFileSync(htmlFileUrl, "utf8"),
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
    setHtmlNodeText(scriptTypeImportmap, importmapAsJson);
  } else {
    injectHtmlNodeAsEarlyAsPossible(
      htmlAst,
      createHtmlNode({
        tagName: "script",
        type: "importmap",
        textContent: importmapAsJson,
      }),
    );
  }
  const html = stringifyHtmlAst(htmlAst);
  writeFileSync(htmlFileUrl, html);
};
