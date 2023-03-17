import { createRequire } from "node:module"
// import { loadOptions } from "@babel/core"
import { readFile } from "@jsenv/filesystem"
import { resolveUrl, urlToFileSystemPath } from "@jsenv/urls"

const require = createRequire(import.meta.url)

// eslint-disable-next-line import/no-unresolved
const parser = require("@babel/parser")
const { loadOptionsAsync } = require("@babel/core")

const directoryUrl = resolveUrl("./", import.meta.url)
const fileUrl = resolveUrl("./decorator.txt", import.meta.url)
const fileText = await readFile(fileUrl)

// try by passing plugins directtly
{
  const ast = parser.parse(fileText, {
    sourceType: "module",
    presets: ["@babel/preset-env"],
    plugins: [
      [
        "decorators",
        {
          decoratorsBeforeExport: true,
        },
      ],
    ],
  })
  console.log(ast)
}

// try with loading config file
{
  const options = await loadOptionsAsync({
    root: urlToFileSystemPath(directoryUrl),
  })
  const ast = parser.parse(fileText, {
    ...options,
    plugins: [
      ...options.plugins,
      ["decorator", { decoratorBeforeExport: true }],
    ],
    sourceType: "module",
  })
  console.log(ast)
}
