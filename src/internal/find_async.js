export const findAsync = ({ array, start, predicate }) => {
  return new Promise((resolve, reject) => {
    const visit = (index) => {
      if (index >= array.length) {
        return resolve()
      }
      const input = array[index]
      const returnValue = start(input)
      return Promise.resolve(returnValue).then((output) => {
        if (predicate(output)) {
          return resolve(output)
        }
        return visit(index + 1)
      }, reject)
    }

    visit(0)
  })
}
