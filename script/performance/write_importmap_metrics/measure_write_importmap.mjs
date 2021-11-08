import { startMeasures } from "@jsenv/performance-impact"

const measures = startMeasures({
  gc: true,
  memoryHeapUsage: true,
  filesystemUsage: true,
})

const { writeImportMapFiles } = await import("@jsenv/importmap-node-module")
await writeImportMapFiles({
  logLevel: "warn",
  projectDirectoryUrl: new URL("./fake_project/", import.meta.url),
  importMapFiles: {
    "./node_resolution.importmap": {
      mappingsForNodeResolution: true,
      mappingsForDevDependencies: true,
    },
  },
})

const {
  duration,
  heapUsed,
  fileSystemReadOperationCount,
  fileSystemWriteOperationCount,
} = measures.stop()

export const writeImportMapMetrics = {
  "write importmap duration": {
    value: duration,
    unit: "ms",
  },
  "write importmap memory heap used": {
    value: heapUsed,
    unit: "byte",
  },
  "number of fs read operation": {
    value: fileSystemReadOperationCount,
  },
  "number of fs write operation": {
    value: fileSystemWriteOperationCount,
  },
}
