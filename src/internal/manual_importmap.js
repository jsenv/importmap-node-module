export const assertManualImportMap = (value) => {
  if (value === null) {
    throw new TypeError(`manualImportMap must be an object, got null`);
  }

  const type = typeof value;
  if (type !== "object") {
    throw new TypeError(`manualImportMap must be an object, received ${value}`);
  }

  const { imports = {}, scopes = {}, ...rest } = value;
  const extraKeys = Object.keys(rest);
  if (extraKeys.length > 0) {
    throw new TypeError(
      `manualImportMap can have "imports" and "scopes", found unexpected keys: "${extraKeys}"`,
    );
  }

  if (typeof imports !== "object") {
    throw new TypeError(
      `manualImportMap.imports must be an object, found ${imports}`,
    );
  }

  if (typeof scopes !== "object") {
    throw new TypeError(
      `manualImportMap.scopes must be an object, found ${imports}`,
    );
  }
};
