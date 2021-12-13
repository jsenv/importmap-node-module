/*
 * This file exports configuration reused by jsenv scripts such as
 *
 * script/test/test.mjs
 *
 * Read more at https://github.com/jsenv/jsenv-core#jsenvconfigmjs
 */

export const projectDirectoryUrl = String(new URL("./", import.meta.url))
