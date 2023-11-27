import { visitNodeModuleResolution } from "./visit_node_module_resolution.js";

export const generateImportmapForNodeESMResolution = async (
  importmapInfos,
  {
    logger,
    warn,
    projectDirectoryUrl,
    packagesManualOverrides,
    exportsFieldWarningConfig,
    onImportmapGenerated,
  },
) => {
  const nodeResolutionVisitors = [];
  for (const importmapRelativeUrl of Object.keys(importmapInfos)) {
    const importmapInfo = importmapInfos[importmapRelativeUrl];
    const {
      mappingsForNodeResolution,
      mappingsForDevDependencies,
      packageUserConditions,
      packageIncludedPredicate,
      runtime = "browser",
    } = importmapInfo.options;
    if (!mappingsForNodeResolution) {
      continue;
    }
    const importsMappings = {};
    const scopesMappings = {};
    const mappingsToPutTopLevel = {};

    nodeResolutionVisitors.push({
      mappingsForDevDependencies,
      runtime,
      packageConditions: packageConditionsFromPackageUserConditions({
        runtime,
        packageUserConditions,
      }),
      packageIncludedPredicate,
      onMapping: ({ scope, from, to }) => {
        if (scope) {
          scopesMappings[scope] = {
            ...(scopesMappings[scope] || {}),
            [from]: to,
          };
          mappingsToPutTopLevel[from] = to;
        } else {
          importsMappings[from] = to;
        }
      },
      onVisitDone: () => {
        Object.keys(mappingsToPutTopLevel).forEach((key) => {
          if (!importsMappings[key]) {
            importsMappings[key] = mappingsToPutTopLevel[key];
          }
        });
        onImportmapGenerated(
          {
            imports: importsMappings,
            scopes: scopesMappings,
          },
          importmapRelativeUrl,
        );
      },
    });
  }

  if (nodeResolutionVisitors.length === 0) {
    return;
  }
  const nodeModulesOutsideProjectAllowed = nodeResolutionVisitors.every(
    (visitor) => visitor.runtime === "node",
  );
  await visitNodeModuleResolution(nodeResolutionVisitors, {
    logger,
    warn,
    projectDirectoryUrl,
    nodeModulesOutsideProjectAllowed,
    packagesManualOverrides,
    exportsFieldWarningConfig,
  });
  for (const nodeResolutionVisitor of nodeResolutionVisitors) {
    nodeResolutionVisitor.onVisitDone();
  }
};

const packageConditionsFromPackageUserConditions = ({
  runtime,
  packageUserConditions,
}) => {
  if (typeof packageUserConditions === "undefined") {
    return ["import", runtime, "default"];
  }

  if (!Array.isArray(packageUserConditions)) {
    throw new TypeError(
      `packageUserConditions must be an array, got ${packageUserConditions}`,
    );
  }

  packageUserConditions.forEach((userCondition) => {
    if (typeof userCondition !== "string") {
      throw new TypeError(
        `user condition must be a string, got ${userCondition}`,
      );
    }
  });

  return [...packageUserConditions, "import", runtime, "default"];
};
