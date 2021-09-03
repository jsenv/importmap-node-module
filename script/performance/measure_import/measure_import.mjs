import { fork } from "node:child_process"
import { fileURLToPath } from "node:url"
import {
  measurePerformanceMultipleTimes,
  computeMetricsMedian,
  logPerformanceMetrics,
} from "@jsenv/performance-impact"

export const measureImport = async ({ iterations = 10 } = {}) => {
  const childProcessFileUrl = new URL(
    "./child_process_measuring_import.mjs",
    import.meta.url,
  )
  const childProcessFilePath = fileURLToPath(childProcessFileUrl)

  const metrics = await measurePerformanceMultipleTimes(
    async () => {
      const childProcess = fork(childProcessFilePath, {
        execArgv: ["--expose-gc"],
      })
      const { msEllapsed, heapUsed } = await new Promise((resolve) => {
        childProcess.on("message", (message) => {
          resolve(message)
        })
      })

      return {
        "import duration": { value: msEllapsed, unit: "ms" },
        "import memory heap used": { value: heapUsed, unit: "byte" },
      }
    },
    iterations,
    { msToWaitBetweenEachMeasure: 50 },
  )
  return computeMetricsMedian(metrics)
}

const executeAndLog = process.argv.includes("--local")
if (executeAndLog) {
  const performanceMetrics = await measureImport({ iterations: 1 })
  logPerformanceMetrics(performanceMetrics)
}
