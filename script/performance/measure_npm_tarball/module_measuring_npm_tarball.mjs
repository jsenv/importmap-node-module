import { exec } from "child_process"

const npmPackInfo = await new Promise((resolve, reject) => {
  exec(`npm pack --dry-run --json`, (error, stdout) => {
    if (error) {
      reject(error)
    } else {
      resolve(JSON.parse(stdout))
    }
  })
})

export const npmTarballInfo = npmPackInfo[0]
