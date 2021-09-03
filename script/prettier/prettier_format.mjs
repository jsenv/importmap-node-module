import { formatWithPrettier } from "@jsenv/prettier-check-project"

import { projectDirectoryUrl } from "../../jsenv.config.mjs"

await formatWithPrettier({
  projectDirectoryUrl,
})
