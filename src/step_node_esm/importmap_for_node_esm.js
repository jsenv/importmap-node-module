import { visitNodeModuleResolution } from "./visit_node_module_resolution.js";

const nodeMappingsDefault = {
  devDependencies: false,
  packageUserConditions: undefined,
  packageIncludedPredicate: undefined,
};

export const generateImportmapForNodeESMResolution = async (
  importmapInfos,
  {
    logger,
    warn,
    rootDirectoryUrl,
    packagesManualOverrides,
    exportsFieldWarningConfig,
    onImportmapGenerated,
  },
) => {
  const nodeResolutionVisitors = [];
  for (const importmapRelativeUrl of Object.keys(importmapInfos)) {
    const importmapInfo = importmapInfos[importmapRelativeUrl];
    let { nodeMappings = {} } = importmapInfo.options;
    if (!nodeMappings) {
      continue;
    }
    const unexpectedKeys = Object.keys(nodeMappings).filter(
      (key) => !Object.hasOwn(nodeMappingsDefault, key),
    );
    if (unexpectedKeys.length > 0) {
      throw new TypeError(
        `${unexpectedKeys.join(",")}: no such key on "nodeMappings"`,
      );
    }
    nodeMappings = { ...nodeMappingsDefault, ...nodeMappings };
    const { devDependencies, packageUserConditions, packageIncludedPredicate } =
      nodeMappings;
    const importsMappings = {};
    const scopesMappings = {};
    const mappingsToPutTopLevel = {};

    nodeResolutionVisitors.push({
      includeDevDependencies: devDependencies,
      packageConditions: packageConditionsFromPackageUserConditions(
        packageUserConditions,
      ),
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
    (visitor) => {
      return visitor.packageConditions.includes("node");
    },
  );
  await visitNodeModuleResolution(nodeResolutionVisitors, {
    logger,
    warn,
    rootDirectoryUrl,
    nodeModulesOutsideProjectAllowed,
    packagesManualOverrides,
    exportsFieldWarningConfig,
  });
  for (const nodeResolutionVisitor of nodeResolutionVisitors) {
    nodeResolutionVisitor.onVisitDone();
  }
};

const packageConditionsFromPackageUserConditions = (packageUserConditions) => {
  if (typeof packageUserConditions === "undefined") {
    return ["import", "browser", "default"];
  }
  if (!Array.isArray(packageUserConditions)) {
    throw new TypeError(
      `packageUserConditions must be an array, got ${packageUserConditions}`,
    );
  }

  const packageConditions = [];
  for (const packageUserCondition of packageUserConditions) {
    if (typeof packageUserCondition !== "string") {
      throw new TypeError(
        `package user condition must be a string, got ${packageUserCondition}`,
      );
    }
    packageConditions.push(packageUserCondition);
  }
  if (!packageConditions.includes("import")) {
    packageConditions.push("import");
  }
  if (
    !packageConditions.includes("browser") &&
    !packageConditions.includes("node")
  ) {
    packageConditions.push("browser");
  }
  if (!packageConditions.includes("default")) {
    packageConditions.push("default");
  }
  return packageConditions;
};
