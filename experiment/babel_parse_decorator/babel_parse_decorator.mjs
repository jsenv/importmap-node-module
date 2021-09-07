import { createRequire } from "node:module"
// import { loadOptions } from "@babel/core"
import { readFile, resolveUrl, urlToFileSystemPath } from "@jsenv/filesystem"

const require = createRequire(import.meta.url)

const parser = require("@babel/parser")
const { loadOptions } = require("@babel/core")

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
  const options = await loadOptions({
    root: urlToFileSystemPath(directoryUrl),
  })
  const ast = parser.parse(fileText, {
    ...options,
    sourceType: "module",
  })
  console.log(ast)
}
