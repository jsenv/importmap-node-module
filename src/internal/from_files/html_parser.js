import { createRequire } from "node:module";
import { readFile } from "@jsenv/filesystem";
import { urlToFilename } from "@jsenv/urls";

const require = createRequire(import.meta.url);

export const parseHTMLRessources = async ({ code, url, asFileUrl }) => {
  const parse5 = require("parse5");
  const htmlAst = parse5.parse(code, { sourceCodeLocationInfo: true });
  const htmlRessources = [];
  visitHtmlAst(htmlAst, (node) => {
    if (node.nodeName !== "script") {
      return;
    }

    const typeAttribute = getHtmlNodeAttributeByName(node, "type");
    const type = typeAttribute ? typeAttribute.value : "application/javascript";
    if (type !== "module") {
      return;
    }

    const srcAttribute = getHtmlNodeAttributeByName(node, "src");
    const src = srcAttribute ? srcAttribute.value : "";
    if (src) {
      htmlRessources.push({
        type: "module script",
        url: new URL(src, url).href,
        // expectedContentType: "application/javascript",
        ...getHtmlNodeLocation(node, "src"),
      });
      return;
    }

    const textNode = getHtmlNodeTextNode(node);
    const id = getIdForInlineHtmlNode(node, htmlAst);
    const specifier = `${urlToFilename(url)}__inline__${id}.js`;
    htmlRessources.push({
      type: "inline module script",
      url: new URL(specifier, url).href,
      // expectedContentType: "application/javascript",
      ...getHtmlNodeLocation(node),
      content: textNode.value,
      contentType: "application/javascript",
    });
  });
  await htmlRessources.reduce(async (previous, htmlRessource) => {
    await previous;
    if (htmlRessource.type !== "module script") {
      return;
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
  }, Promise.resolve());
  return htmlRessources;
};

const STOP_AST_VISIT = "stop";
const visitHtmlAst = (htmlAst, callback) => {
  const visitNode = (node) => {
    const callbackReturnValue = callback(node);
    if (callbackReturnValue === STOP_AST_VISIT) {
      return;
    }
    const { childNodes } = node;
    if (childNodes) {
      let i = 0;
      while (i < childNodes.length) {
        visitNode(childNodes[i++]);
      }
    }
  };
  visitNode(htmlAst);
};

const getHtmlNodeAttributeByName = (htmlNode, attributeName) => {
  const attrs = htmlNode.attrs;
  return attrs && attrs.find((attr) => attr.name === attributeName);
};

const getHtmlNodeTextNode = (htmlNode) => {
  const firstChild = htmlNode.childNodes[0];
  return firstChild && firstChild.nodeName === "#text" ? firstChild : null;
};

const getHtmlNodeLocation = (htmlNode, htmlAttributeName) => {
  const { sourceCodeLocation } = htmlNode;
  if (!sourceCodeLocation) {
    return null;
  }

  if (!htmlAttributeName) {
    const { startLine, startCol } = sourceCodeLocation;
    return {
      line: startLine,
      column: startCol,
    };
  }

  const attributeSourceCodeLocation =
    sourceCodeLocation.attrs[htmlAttributeName];
  if (!attributeSourceCodeLocation) {
    return null;
  }
  const { startLine, startCol } = attributeSourceCodeLocation;
  return {
    line: startLine,
    column: startCol,
  };
};

const getIdForInlineHtmlNode = (node, htmlAst) => {
  const idAttribute = getHtmlNodeAttributeByName(node, "id");
  if (idAttribute) {
    return idAttribute.value;
  }
  const { line, column } = getHtmlNodeLocation(node) || {};
  let lineTaken = false;
  visitHtmlAst(htmlAst, (nodeCandidate) => {
    if (nodeCandidate === node) return null;
    if (nodeCandidate.nodeName === "#text") return null;
    const htmlNodeLocation = getHtmlNodeLocation(nodeCandidate);
    if (!htmlNodeLocation) return null;
    if (htmlNodeLocation.line !== line) return null;
    lineTaken = true;
    return STOP_AST_VISIT;
  });
  if (lineTaken) {
    return `${line}.${column}`;
  }
  return line;
};
