export const packageConditionsFromPackageUserConditions = ({
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
