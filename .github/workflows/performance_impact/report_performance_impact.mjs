/*
 * This file is executed by performance_impact.yml GitHub workflow.
 * - it generates performance report before and after merging a pull request
 * - Then, it creates or updates a comment in the pull request
 * See https://github.com/jsenv/performance-impact
 */

import {
  reportPerformanceImpact,
  readGitHubWorkflowEnv,
} from "@jsenv/performance-impact"

reportPerformanceImpact({
  ...readGitHubWorkflowEnv(),
  logLevel: "debug",
  installCommand: "npm install",
  moduleGeneratingPerformanceReportRelativeUrl:
    "./script/performance/generate_performance_report.mjs",
})
