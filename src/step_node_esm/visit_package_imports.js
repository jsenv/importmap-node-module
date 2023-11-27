/*

https://nodejs.org/docs/latest-v15.x/api/packages.html#packages_node_js_package_json_field_definitions

*/

import { urlToFileSystemPath } from "@jsenv/urls";

import { specifierIsRelative } from "./specifier_is_relative.js";

export const visitPackageImports = ({
  warn,
  packageInfo,
  packageImports = packageInfo.object.imports,
  packageConditions,
}) => {
  const importsSubpaths = {};
  const onImportsSubpath = ({ key, value, trace }) => {
    if (!specifierIsRelative(value)) {
      warn(
        createSubpathValueMustBeRelativeWarning({
          value,
          valueTrace: trace,
          packageInfo,
        }),
      );
      return;
    }

    const keyNormalized = key;
    const valueNormalized = value;
    importsSubpaths[keyNormalized] = valueNormalized;
  };

  const visitSubpathValue = (subpathValue, subpathValueTrace) => {
    if (typeof subpathValue === "string") {
      return handleString(subpathValue, subpathValueTrace);
    }

    if (typeof subpathValue === "object" && subpathValue !== null) {
      return handleObject(subpathValue, subpathValueTrace);
    }

    return handleRemaining(subpathValue, subpathValueTrace);
  };

  const handleString = (subpathValue, subpathValueTrace) => {
    const firstBareKey = subpathValueTrace
      .slice()
      .reverse()
      .find((key) => key.startsWith("#"));
    onImportsSubpath({
      key: firstBareKey,
      value: subpathValue,
      trace: subpathValueTrace,
    });
    return true;
  };

  const handleObject = (subpathValue, subpathValueTrace) => {
    // From Node.js documentation:
    // "If a nested conditional does not have any mapping it will continue
    // checking the remaining conditions of the parent condition"
    // https://nodejs.org/docs/latest-v14.x/api/packages.html#packages_nested_conditions
    //
    // So it seems what we do here is not sufficient
    // -> if the condition finally does not lead to something
    // it should be ignored and an other branch be taken until
    // something resolves
    const followConditionBranch = (subpathValue, conditionTrace) => {
      const bareKeys = [];
      const conditionalKeys = [];
      Object.keys(subpathValue).forEach((availableKey) => {
        if (availableKey.startsWith("#")) {
          bareKeys.push(availableKey);
        } else {
          conditionalKeys.push(availableKey);
        }
      });

      if (bareKeys.length > 0 && conditionalKeys.length > 0) {
        warn(
          createSubpathKeysAreMixedWarning({
            subpathValue,
            subpathValueTrace: [...subpathValueTrace, ...conditionTrace],
            packageInfo,
            bareKeys,
            conditionalKeys,
          }),
        );
        return false;
      }

      // there is no condition, visit all bare keys (starting with #)
      if (conditionalKeys.length === 0) {
        let leadsToSomething = false;
        bareKeys.forEach((key) => {
          leadsToSomething = visitSubpathValue(subpathValue[key], [
            ...subpathValueTrace,
            ...conditionTrace,
            key,
          ]);
        });
        return leadsToSomething;
      }

      // there is a condition, keep the first one leading to something
      return conditionalKeys.some((keyCandidate) => {
        if (!packageConditions.includes(keyCandidate)) {
          return false;
        }
        const valueCandidate = subpathValue[keyCandidate];
        return visitSubpathValue(valueCandidate, [
          ...subpathValueTrace,
          ...conditionTrace,
          keyCandidate,
        ]);
      });
    };

    return followConditionBranch(subpathValue, []);
  };

  const handleRemaining = (subpathValue, subpathValueTrace) => {
    warn(
      createSubpathIsUnexpectedWarning({
        subpathValue,
        subpathValueTrace,
        packageInfo,
      }),
    );
    return false;
  };

  visitSubpathValue(packageImports, ["imports"]);

  return importsSubpaths;
};

const createSubpathIsUnexpectedWarning = ({
  subpathValue,
  subpathValueTrace,
  packageInfo,
}) => {
  return {
    code: "IMPORTS_SUBPATH_UNEXPECTED",
    message: `unexpected subpath in package.json imports: value must be an object or a string.
--- value ---
${subpathValue}
--- value at ---
${subpathValueTrace.join(".")}
--- package.json path ---
${urlToFileSystemPath(packageInfo.url)}`,
  };
};

const createSubpathKeysAreMixedWarning = ({
  subpathValue,
  subpathValueTrace,
  packageInfo,
}) => {
  return {
    code: "IMPORTS_SUBPATH_MIXED_KEYS",
    message: `unexpected subpath keys in package.json imports: cannot mix bare and conditional keys.
--- value ---
${JSON.stringify(subpathValue, null, "  ")}
--- value at ---
${subpathValueTrace.join(".")}
--- package.json path ---
${urlToFileSystemPath(packageInfo.url)}`,
  };
};

const createSubpathValueMustBeRelativeWarning = ({
  value,
  valueTrace,
  packageInfo,
}) => {
  return {
    code: "IMPORTS_SUBPATH_VALUE_UNEXPECTED",
    message: `unexpected subpath value in package.json imports: value must be relative to package
--- value ---
${value}
--- value at ---
${valueTrace.join(".")}
--- package.json path ---
${urlToFileSystemPath(packageInfo.url)}`,
  };
};
