export const objectMap = (object, callback) => {
  const mapped = {}

  Object.keys(object).forEach((key) => {
    Object.assign(mapped, callback(key, object[key], object))
  })

  return mapped
}
