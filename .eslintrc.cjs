const {
  composeEslintConfig,
  eslintConfigBase,
  eslintConfigForPrettier,
  eslintConfigToPreferExplicitGlobals,
  jsenvEslintRules,
  jsenvEslintRulesForImport,
} = require("@jsenv/eslint-config")

const eslintConfig = composeEslintConfig(
  eslintConfigBase,
  {
    rules: jsenvEslintRules,
  },
  {
    env: {
      node: true,
    },
    overrides: [
      {
        files: ["**/*.cjs"],
        // inside *.cjs files. restore commonJS "globals"
        env: {
          node: true,
          commonjs: true,
        },
        // inside *.cjs files, use commonjs module resolution
        settings: {
          "import/resolver": {
            node: {},
          },
        },
      },
    ],
  },
  {
    plugins: ["import"],
    settings: {
      "import/resolver": {
        "@jsenv/importmap-eslint-resolver": {
          projectDirectoryUrl: __dirname,
          importMapFileRelativeUrl: "./import-map.importmap",
          node: true,
        },
      },
    },
    rules: jsenvEslintRulesForImport,
  },
  eslintConfigToPreferExplicitGlobals,
  eslintConfigForPrettier,
)

module.exports = eslintConfig
