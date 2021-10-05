/*
 * This file is used to configure a list of babel plugins as documented in
 * https://babeljs.io/docs/en/config-files
 *
 * During dev: babel plugins natively supported by browsers and Node.js are not used.
 * During build:
 *  - When "runtimeSupport" is configured, babel plugins already supported by these runtime won't be used
 *  See https://github.com/jsenv/jsenv-template-node-package/blob/main/script/build/build.mjs#L25
 *  - Otherwise all babel plugins are use
 *
 */

// "@babel/preset-env" transforms async function to generators
// but it's verbose and slow compared to using promises, so we:
// 1. Exclude "transform-async-to-generator", "transform-regenerator"
// 2. Enable "babel-plugin-transform-async-to-promises"
// See https://github.com/babel/babel/issues/8121
module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        modules: false,
        exclude: ["transform-async-to-generator", "transform-regenerator"],
      },
    ],
  ],
  plugins: ["babel-plugin-transform-async-to-promises"],
}
