import {
  generateUrlForInlineContent,
  getHtmlNodeAttribute,
  getHtmlNodeAttributePosition,
  getHtmlNodePosition,
  getHtmlNodeText,
  parseHtml,
  visitHtmlNodes,
} from "@jsenv/ast";
import { readFile } from "@jsenv/filesystem";

export const parseHTMLRessources = async ({ code, url, asFileUrl }) => {
  const htmlAst = parseHtml({ html: code, url, storeOriginalPositions: false });
  const htmlRessources = [];
  visitHtmlNodes(htmlAst, {
    script: (node) => {
      const type = getHtmlNodeAttribute(node, "type");
      if (type !== "module") {
        return;
      }
      const src = getHtmlNodeAttribute(node, "src");
      if (src) {
        const { line, column } = getHtmlNodeAttributePosition(node, "src");
        htmlRessources.push({
          type: "module script",
          url: new URL(src, url).href,
          // expectedContentType: "application/javascript",
          line,
          column,
        });
        return;
      }

      const text = getHtmlNodeText(node);
      const { line, column, lineEnd, columnEnd } = getHtmlNodePosition(node, {
        preferOriginal: true,
      });
      const urlForInlineContent = generateUrlForInlineContent({
        url,
        extension: ".js",
        line,
        column,
        lineEnd,
        columnEnd,
      });
      htmlRessources.push({
        type: "inline module script",
        url: urlForInlineContent,
        // expectedContentType: "application/javascript",
        line,
        column,
        content: text,
        contentType: "application/javascript",
      });
    },
  });

  for (const htmlRessource of htmlRessources) {
    if (htmlRessource.type !== "module script") {
      continue;
    }
    // let's fetch the url
    const fileUrl = asFileUrl(htmlRessource.url);
    if (fileUrl) {
      const fileContent = await readFile(fileUrl, { as: "string" });
      htmlRessource.content = fileContent;
      htmlRessource.contentType = "application/javascript";
    } else {
      htmlRessource.isExternal = true;
    }
  }
  return htmlRessources;
};
