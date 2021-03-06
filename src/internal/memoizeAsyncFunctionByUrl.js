export const memoizeAsyncFunctionByUrl = (fn) => {
  const cache = {}
  return async (url, ...args) => {
    const promiseFromCache = cache[url]
    if (promiseFromCache) {
      return promiseFromCache
    }
    let _resolve
    let _reject
    const promise = new Promise((resolve, reject) => {
      _resolve = resolve
      _reject = reject
    })
    cache[url] = promise
    let value
    let error
    try {
      value = fn(url, ...args)
      error = false
    } catch (e) {
      value = e
      error = true
      delete cache[url]
    }
    if (error) {
      _reject(error)
    } else {
      _resolve(value)
    }
    return promise
  }
}
