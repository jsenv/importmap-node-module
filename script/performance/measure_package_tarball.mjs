import { exec } from "node:child_process"

const npmPackInfo = await new Promise((resolve, reject) => {
  exec(`npm pack --dry-run --json`, (error, stdout) => {
    if (error) {
      reject(error)
    } else {
      resolve(JSON.parse(stdout))
    }
  })
})
const npmTarballInfo = npmPackInfo[0]

export const packageTarballmetrics = {
  "npm tarball size": { value: npmTarballInfo.size, unit: "byte" },
  "npm tarball unpacked size": {
    value: npmTarballInfo.unpackedSize,
    unit: "byte",
  },
  "npm tarball file count": { value: npmTarballInfo.entryCount },
}
