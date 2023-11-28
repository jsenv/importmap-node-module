# 6.0.0

- major: `writeImportMapFiles` function renamed `writeImportmaps`
- major: `importMapFiles` param renamed `importmaps`
- major: `entryPointsToCheck` param renamed `entryPoints`
- major: `manualImportMap` option renamed `manualImportmap`
- feat: Allow to write importmap into html files
- feat: warning when `bareSpecifierAutomapping` is used without `entryPoints`
- feat: allow to use options related to entry points without having to specify entry point when importmap is written to html. Both in CLI and API.
- feat: add --dir to CLI

# 5.5.0

- Add CLI

# 5.4.0

- Allow root package without names

# 5.3.0

- add `babelConfigFileUrl` param to `writeImportMapFiles`
- Enable many parser plugins by default such as import assertions
- Update dependencies
