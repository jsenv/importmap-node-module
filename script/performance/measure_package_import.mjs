import { startMeasures } from "@jsenv/performance-impact"

const measures = startMeasures({
  gc: true,
  memoryHeapUsage: true,
})

// eslint-disable-next-line no-unused-vars
let namespace = await import("@jsenv/importmap-node-module")

const { duration, heapUsed } = measures.stop()

export const packageImportMetrics = {
  "import duration": { value: duration, unit: "ms" },
  "import memory heap used": { value: Math.max(heapUsed, 0), unit: "byte" },
}
