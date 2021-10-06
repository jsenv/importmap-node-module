import { parentPort } from "node:worker_threads"
import { memoryUsage } from "node:process"

global.gc()
const beforeHeapUsed = memoryUsage().heapUsed
const beforeMs = Date.now()

let namespace = await import("@jsenv/importmap-node-module")

const afterMs = Date.now()
const afterHeapUsed = memoryUsage().heapUsed
// eslint-disable-next-line no-unused-vars
namespace = null
global.gc()

const heapUsed = afterHeapUsed - beforeHeapUsed
const msEllapsed = afterMs - beforeMs
parentPort.postMessage({
  heapUsed,
  msEllapsed,
})
