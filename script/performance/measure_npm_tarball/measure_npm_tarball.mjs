import { logPerformanceMetrics } from "@jsenv/performance-impact"

export const measureNpmTarball = async () => {
  const fileUrl = new URL("./module_measuring_npm_tarball.mjs", import.meta.url)
  const { npmTarballInfo } = await import(`${fileUrl}?t=${Date.now()}`)

  return {
    "npm tarball size": { value: npmTarballInfo.size, unit: "byte" },
    "npm tarball unpacked size": {
      value: npmTarballInfo.unpackedSize,
      unit: "byte",
    },
    "npm tarball file count": { value: npmTarballInfo.entryCount },
  }
}

const executeAndLog = process.argv.includes("--local")
if (executeAndLog) {
  const performanceMetrics = await measureNpmTarball()
  logPerformanceMetrics(performanceMetrics)
}
