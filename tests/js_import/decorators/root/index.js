@sealed
export class BugReport {
  type = "report"
  title = ""

  constructor(t) {
    this.title = t
  }
}

function sealed(constructor) {
  Object.seal(constructor)
  Object.seal(constructor.prototype)
}
