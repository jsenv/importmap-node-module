import { uploadCoverage } from "@jsenv/codecov-upload"

import { projectDirectoryUrl } from "../../jsenv.config.mjs"

await uploadCoverage({
  projectDirectoryUrl,
})
