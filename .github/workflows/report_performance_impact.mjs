/*
 * This file is executed by performance_impact.yml GitHub workflow.
 * - it generates performance report before and after merging a pull request
 * - Then, it creates or updates a comment in the pull request
 * See https://github.com/jsenv/performance-impact
 */

import {
  readGitHubWorkflowEnv,
  reportPerformanceImpact,
} from "@jsenv/performance-impact";

await reportPerformanceImpact({
  ...readGitHubWorkflowEnv(),
  logLevel: "debug",
  installCommand: "npm install",
  performanceReportUrl: new URL(
    "../../scripts/performance.mjs#performanceReport",
    import.meta.url,
  ),
});
