import { startMeasures } from "@jsenv/performance-impact";

const measures = startMeasures({
  gc: true,
  memoryHeap: true,
});

// eslint-disable-next-line no-unused-vars
let namespace = await import("@jsenv/importmap-node-module");

const { duration, memoryHeapUsed } = measures.stop();

export const packageImportMetrics = {
  "import duration": { value: duration, unit: "ms" },
  "import memory heap used": {
    value: Math.max(memoryHeapUsed, 0),
    unit: "byte",
  },
};
