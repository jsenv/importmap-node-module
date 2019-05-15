const getFromProcessArguments = (name) => {
  const rawBooleanArg = process.argv.find((arg) => {
    return arg === `--${name}`
  })
  if (rawBooleanArg) {
    return true
  }

  const rawValueArg = process.argv.find((arg) => {
    return arg.startsWith(`--${name}=`)
  })
  if (!rawValueArg) {
    return false
  }

  return rawValueArg.slice(`--${name}=`.length)
}

module.exports.getFromProcessArguments = getFromProcessArguments
