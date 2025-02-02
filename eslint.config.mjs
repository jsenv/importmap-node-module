import { eslintConfigRelax } from "@jsenv/eslint-config-relax";

export default [
  ...eslintConfigRelax({
    rootDirectoryUrl: new URL("./", import.meta.url),
  }),
  {
    ignores: [
      "scripts/performance/**/fake_project/**",
      "experiment/**/dist/**",
      "tests/**/root/**",
      "tests/**/input/**",
    ],
  },
];
