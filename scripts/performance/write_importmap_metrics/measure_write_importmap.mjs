import { startMeasures } from "@jsenv/performance-impact";

const measures = startMeasures({
  gc: true,
  memoryHeap: true,
  filesystem: true,
});

const { writeImportmaps } = await import("@jsenv/importmap-node-module");
await writeImportmaps({
  logLevel: "warn",
  projectDirectoryUrl: new URL("./fake_project/", import.meta.url),
  importmaps: {
    "./node_resolution.importmap": {
      mappingsForNodeResolution: true,
      mappingsForDevDependencies: true,
    },
  },
});

const { duration, memoryHeapUsed, fsRead, fsWrite } = measures.stop();

export const writeImportMapMetrics = {
  "write importmap duration": {
    value: duration,
    unit: "ms",
  },
  "write importmap memory heap used": {
    value: memoryHeapUsed,
    unit: "byte",
  },
  "number of fs read operation": {
    value: fsRead,
  },
  "number of fs write operation": {
    value: fsWrite,
  },
};
