export const memoizeAsyncFunctionByUrl = (fn) => {
  const cache = {}
  return memoizeAsyncFunction(fn, {
    getMemoryEntryFromArguments: ([url]) => {
      return {
        get: () => {
          return cache[url]
        },
        set: (promise) => {
          cache[url] = promise
        },
        delete: () => {
          delete cache[url]
        },
      }
    },
  })
}

export const memoizeAsyncFunctionBySpecifierAndImporter = (fn) => {
  const importerCache = {}
  return memoizeAsyncFunction(fn, {
    getMemoryEntryFromArguments: ([specifier, importer]) => {
      return {
        get: () => {
          const specifierCacheForImporter = importerCache[importer]
          return specifierCacheForImporter ? specifierCacheForImporter[specifier] : null
        },
        set: (promise) => {
          const specifierCacheForImporter = importerCache[importer]
          if (specifierCacheForImporter) {
            specifierCacheForImporter[specifier] = promise
          } else {
            importerCache[importer] = {
              [specifier]: promise,
            }
          }
        },
        delete: () => {
          const specifierCacheForImporter = importerCache[importer]
          if (specifierCacheForImporter) {
            delete specifierCacheForImporter[specifier]
          }
        },
      }
    },
  })
}

const memoizeAsyncFunction = (fn, { getMemoryEntryFromArguments }) => {
  return async (...args) => {
    const memoryEntry = getMemoryEntryFromArguments(args)
    const promiseFromMemory = memoryEntry.get()
    if (promiseFromMemory) {
      return promiseFromMemory
    }
    let _resolve
    let _reject
    const promise = new Promise((resolve, reject) => {
      _resolve = resolve
      _reject = reject
    })
    memoryEntry.set(promise)
    let value
    let error
    try {
      value = fn(...args)
      error = false
    } catch (e) {
      value = e
      error = true
      memoryEntry.delete()
    }
    if (error) {
      _reject(error)
    } else {
      _resolve(value)
    }
    return promise
  }
}
