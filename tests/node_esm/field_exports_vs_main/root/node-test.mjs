import { createRequire } from "module";

const require = createRequire(import.meta.url);

const main = require.resolve("whatever");
console.log(main);
