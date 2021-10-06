import { Worker } from "node:worker_threads"
import { fileURLToPath } from "node:url"
import {
  measurePerformanceMultipleTimes,
  computeMetricsMedian,
  logPerformanceMetrics,
} from "@jsenv/performance-impact"

export const measureImport = async ({ iterations = 10 } = {}) => {
  if (!global.gc) {
    throw new Error("missing --expose-gc")
  }
  const workerFileUrl = new URL(
    "./worker_measuring_import.mjs",
    import.meta.url,
  )
  const workerFilePath = fileURLToPath(workerFileUrl)

  const metrics = await measurePerformanceMultipleTimes(
    async () => {
      const worker = new Worker(workerFilePath)
      const { msEllapsed, heapUsed } = await new Promise((resolve, reject) => {
        worker.on("message", resolve)
        worker.on("error", reject)
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
