/* eslint-disable no-unused-vars */
import { memoryUsage } from "process"

global.gc()
const beforeHeapUsed = memoryUsage().heapUsed
const beforeMs = Date.now()

let namespace = await import(`../../../main.js?t=${Date.now()}`)

const afterMs = Date.now()

const msEllapsed = afterMs - beforeMs
const afterHeapUsed = memoryUsage().heapUsed

const heapUsed = afterHeapUsed - beforeHeapUsed
process.send({ msEllapsed, heapUsed })

namespace = null
global.gc()
