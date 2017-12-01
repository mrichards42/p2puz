import _ from 'lodash'

class Settings {
  set(data) {
    const stack = [[data, []]]
    do {
      const [data, path] = stack.pop()
      for (const k in data) {
        const key = path.concat(k).join('.')
        const val = data[k]
        if (_.isObject(val)) {
          stack.push([val, [key]])
        } else {
          this[key] = val
        }
      }
    } while (stack.length)
    return this
  }

  parse(json) {
    const data = JSON.parse(json)
    for (const key in data) {
      this[key] = data[key]
    }
    return this
  }

  save() {
    return JSON.stringify(this)
  }
}

// Global settings object
export default new Settings()
