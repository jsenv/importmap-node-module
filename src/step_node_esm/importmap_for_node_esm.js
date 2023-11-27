import { visitNodeModuleResolution } from "./visit_node_module_resolution.js";

export const generateImportmapForNodeESMResolution = async (
  optionsArray,
  {
    logger,
    warn,
    projectDirectoryUrl,
    packagesManualOverrides,
    exportsFieldWarningConfig,
  },
) => {
  const importmaps = [];
  const nodeResolutionVisitors = [];
  for (const options of optionsArray) {
    const {
      mappingsForNodeResolution,
      mappingsForDevDependencies,
      packageUserConditions,
      packageIncludedPredicate,
      runtime = "browser",
    } = options;
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
        importmaps.push({
          imports: importsMappings,
          scopes: scopesMappings,
        });
      },
    });
  }

  if (nodeResolutionVisitors.length === 0) {
    return importmaps;
  }
  const nodeModulesOutsideProjectAllowed = nodeResolutionVisitors.every(
    (visitor) => visitor.runtime === "node",
  );
  await visitNodeModuleResolution({
    logger,
    warn,
    projectDirectoryUrl,
    nodeModulesOutsideProjectAllowed,
    visitors: nodeResolutionVisitors,
    packagesManualOverrides,
    exportsFieldWarningConfig,
  });
  for (const nodeResolutionVisitor of nodeResolutionVisitors) {
    nodeResolutionVisitor.onVisitDone();
  }
  return importmaps;
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
