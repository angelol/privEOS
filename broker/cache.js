'use strict'
const moment = require('moment')

class Cache {
  constructor() {
    this.store = {}
  }
  
  set(key, value, timeout=3) {
    const expires = moment().add(timeout, 's')
    this.store[key] = [value, expires]
    return value
  }
  
  get(key) {
    const [value, expires] = this.store[key]
    if(moment() > expires) {
      delete this.store[key]
      throw new Error('Expired')
    } else {
      return value
    }
  }
  
  get_or_set(key, value_callable, timeout) {
    try {
      const data = this.get(key)
      return data
    } catch(e) {
      return this.set(key, value_callable(), timeout)
    }
  }
  
  async get_or_set_async(key, value_callable, timeout) {
    try {
      const data = this.get(key)
      return data
    } catch(e) {
      return this.set(key, await value_callable(), timeout)
    }
  }
}

module.exports = new Cache()
