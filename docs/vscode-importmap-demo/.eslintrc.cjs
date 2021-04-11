module.exports = {
  settings: {
    "import/resolver": {
      [require.resolve("@jsenv/importmap-eslint-resolver")]: {
        projectDirectoryUrl: __dirname,
      },
    },
  },
}
