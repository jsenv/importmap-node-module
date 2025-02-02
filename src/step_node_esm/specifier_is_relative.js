export const specifierIsRelative = (specifier) => {
  if (specifier.startsWith("//")) {
    return false;
  }
  if (specifier.startsWith("../")) {
    return false;
  }
  // starts with http:// or file:// or ftp: for instance
  if (/^[a-zA-Z]+:/.test(specifier)) {
    return false;
  }
  return true;
};
