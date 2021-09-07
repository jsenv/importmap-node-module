import { createRequire } from "node:module"
import { urlToFileSystemPath, urlToExtension } from "@jsenv/filesystem"

const require = createRequire(import.meta.url)

const parser = require("@babel/parser")
const traverse = require("@babel/traverse")

export const parseImportSpecifiers = async (
  url,
  { urlResponseText, jsFilesParsingOptions, babelOptions } = {},
) => {
  const urlExtension = urlToExtension(url)

  const {
    jsx = [".jsx", ".tsx"].includes(urlExtension),
    typescript = [".ts", ".tsx"].includes(urlExtension),
    flow = false,
  } = jsFilesParsingOptions

  const initialPlugins = babelOptions.plugins
  const plugins = [
    ...initialPlugins,
    ...(jsx && !findPluginByKey(initialPlugins, "jsx") ? ["jsx"] : []),
    ...(typescript && !findPluginByKey(initialPlugins, "typescript")
      ? ["typescript"]
      : []),
    ...(flow && !findPluginByKey(initialPlugins, "flow") ? ["flow"] : []),
  ]
  const decoratorPlugin = findPluginByKey(initialPlugins, "proposal-decorators")
  if (decoratorPlugin) {
    // When codebase uses decorators, babel assert decorator should be in the list of plugins
    // bu even if it is, babel fails to detect it!
    // by forcing the name to "decorators" as done below, babel is happy
    plugins[plugins.indexOf(decoratorPlugin)] = [
      "decorators",
      decoratorPlugin.options,
    ]
  }

  const ast = parser.parse(urlResponseText, {
    ...babelOptions,
    sourceType: "module",
    sourceFilename: url.startsWith("file://") ? urlToFileSystemPath(url) : url,
    plugins,
    ranges: true,
  })

  const specifiers = {}

  const addSpecifier = ({ path, type }) => {
    const specifier = path.node.value
    specifiers[specifier] = {
      line: path.node.loc.start.line,
      column: path.node.loc.start.column,
      type,
    }
  }

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
        return
      }
      if (path.node.arguments[0].type !== "StringLiteral") {
        // Non-string argument, probably a variable or expression, e.g.
        // import(moduleId)
        // import('./' + moduleName)
        return
      }
      addSpecifier({
        path: path.get("arguments")[0],
        type: "import-dynamic",
      })
    },
    ExportAllDeclaration: (path) => {
      addSpecifier({
        path: path.get("source"),
        type: "export-all",
      })
    },
    ExportNamedDeclaration: (path) => {
      if (!path.node.source) {
        // This export has no "source", so it's probably
        // a local variable or function, e.g.
        // export { varName }
        // export const constName = ...
        // export function funcName() {}
        return
      }
      addSpecifier({
        path: path.get("source"),
        type: "export-named",
      })
    },
    ImportDeclaration: (path) => {
      addSpecifier({
        path: path.get("source"),
        type: "import-static",
      })
    },
  })

  return specifiers
}

const findPluginByKey = (plugins, key) => {
  return plugins.find(
    (plugin) => plugin === key || plugin.key === key || plugin[0] === key,
  )
}
