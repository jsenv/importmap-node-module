import { parentPort } from "node:worker_threads"
import { resourceUsage, memoryUsage } from "node:process"

global.gc()
const beforeHeapUsed = memoryUsage().heapUsed
const beforeRessourceUsage = resourceUsage()
const beforeMs = Date.now()

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

global.gc()
const afterMs = Date.now()
const afterRessourceUsage = resourceUsage()
const afterHeapUsed = memoryUsage().heapUsed

const msEllapsed = afterMs - beforeMs
const heapUsed = afterHeapUsed - beforeHeapUsed
const fileSystemReadOperationCount =
  afterRessourceUsage.fsRead - beforeRessourceUsage.fsRead
const fileSystemWriteOperationCount =
  afterRessourceUsage.fsWrite - beforeRessourceUsage.fsWrite
parentPort.postMessage({
  heapUsed,
  msEllapsed,
  fileSystemReadOperationCount,
  fileSystemWriteOperationCount,
})
