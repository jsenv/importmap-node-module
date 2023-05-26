import { createRequire } from "node:module";
import { parseAsync } from "@babel/core";
import { urlToFileSystemPath } from "@jsenv/urls";

const require = createRequire(import.meta.url);

const traverse = require("@babel/traverse");

export const parseSpecifiersFromJs = async ({
  code,
  url,
  babelOptions = {},
}) => {
  const { parserOpts = {} } = babelOptions;
  const parserPlugins = parserOpts.plugins || [];

  if (!parserPlugins.includes("dynamicImport")) {
    parserPlugins.push("dynamicImport");
  }
  if (!parserPlugins.includes("importAssertions")) {
    parserPlugins.push("importAssertions");
  }
  if (!parserPlugins.includes("classProperties")) {
    parserPlugins.push("classProperties");
  }
  if (!parserPlugins.includes("classPrivateProperties")) {
    parserPlugins.push("classPrivateProperties");
  }
  if (!parserPlugins.includes("classPrivateMethods")) {
    parserPlugins.push("classPrivateMethods");
  }
  if (!parserPlugins.includes("jsx")) {
    parserPlugins.push("jsx");
  }
  const { pathname } = new URL(url);
  if (pathname.endsWith(".ts") || pathname.endsWith(".tsx")) {
    parserPlugins.push("typescript");
  }
  const ast = await parseAsync(code, {
    ...babelOptions,
    sourceType: "module",
    filename: url.startsWith("file://") ? urlToFileSystemPath(url) : url,
    plugins: babelOptions.plugins,
    // ranges: true,
    parserOpts: {
      ...parserOpts,
      ranges: true,
      plugins: parserPlugins,
    },
  });

  const specifiers = {};

  const addSpecifier = ({ path, type }) => {
    const specifier = path.node.value;
    specifiers[specifier] = {
      line: path.node.loc.start.line,
      column: path.node.loc.start.column,
      type,
    };
  };

  traverse.default(ast, {
    // "ImportExpression is replaced with a CallExpression whose callee is an Import node."
    // https://babeljs.io/docs/en/babel-parser#output
    // ImportExpression: (path) => {
    //   if (path.node.arguments[0].type !== "StringLiteral") {
    //     // Non-string argument, probably a variable or expression, e.g.
    //     // import(moduleId)
    //     // import('./' + moduleName)
    //     return
    //   }
    //   addSpecifier(path.get("arguments")[0])
    // },
    CallExpression: (path) => {
      if (path.node.callee.type !== "Import") {
        // Some other function call, not import();
        return;
      }
      if (path.node.arguments[0].type !== "StringLiteral") {
        // Non-string argument, probably a variable or expression, e.g.
        // import(moduleId)
        // import('./' + moduleName)
        return;
      }
      addSpecifier({
        path: path.get("arguments")[0],
        type: "import-dynamic",
      });
    },
    ExportAllDeclaration: (path) => {
      addSpecifier({
        path: path.get("source"),
        type: "export-all",
      });
    },
    ExportNamedDeclaration: (path) => {
      if (!path.node.source) {
        // This export has no "source", so it's probably
        // a local variable or function, e.g.
        // export { varName }
        // export const constName = ...
        // export function funcName() {}
        return;
      }
      addSpecifier({
        path: path.get("source"),
        type: "export-named",
      });
    },
    ImportDeclaration: (path) => {
      addSpecifier({
        path: path.get("source"),
        type: "import-static",
      });
    },
  });

  return specifiers;
};
