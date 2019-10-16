export const hasScheme = (string) => {
  return /^[a-zA-Z]{2,}:/.test(string)
}
