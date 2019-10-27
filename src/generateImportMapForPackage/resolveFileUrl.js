export const resolveFileUrl = (specifier, baseUrl) => {
  return String(new URL(specifier, baseUrl))
}
