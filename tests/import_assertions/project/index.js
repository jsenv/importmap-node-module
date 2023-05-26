const cssModule = await import(
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap",
  { assert: { type: "css" } }
);
console.log(cssModule);

// eslint-disable-next-line import/no-unresolved
import("./file");
