/*
 * This file is designed to be executed locally or by an automated process.
 *
 * To run it locally, use one of
 * - node ./script/performance/generate_performance_report.mjs --local
 * - npm run measure-performances
 *
 * The automated process is a GitHub workflow: ".github/workflows/performance_impact.yml"
 * It will dynamically import this file and call generatePerformanceReport.
 *
 * generatePerformanceReport is measuring:
 * - Time and memory used to import this package
 * - Size and number of files inside the npm tarball that would be published on npm
 * - Time, memory and filesystem usage to generate an importmap file
 *
 * See https://github.com/jsenv/performance-impact
 */

export const generatePerformanceReport = async () => {
  const { measureImport } = await import("./measure_import/measure_import.mjs")
  const { measureNpmTarball } = await import(
    "./measure_npm_tarball/measure_npm_tarball.mjs"
  )
  const { measureImportMapGeneration } = await import(
    "./measure_importmap_generation/measure_importmap_generation.mjs"
  )

  const importMetrics = await measureImport()
  const npmTarballMetrics = await measureNpmTarball()
  const importMapGenerationMetrics = await measureImportMapGeneration()

  return {
    groups: {
      "package metrics": {
        ...importMetrics,
        ...npmTarballMetrics,
      },
      "generating importmap metrics": {
        ...importMapGenerationMetrics,
      },
    },
  }
}

const executeAndLog = process.argv.includes("--local")
if (executeAndLog) {
  await import("./measure_import/measure_import.mjs")
  await import("./measure_npm_tarball/measure_npm_tarball.mjs")
  await import(
    "./measure_importmap_generation/measure_importmap_generation.mjs"
  )
}
