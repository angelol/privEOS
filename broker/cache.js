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
  
  async set_async(key, promise, timeout=3) {
    const value = await promise
    const expires = moment().add(timeout, 's')
    this.store[key] = [value, expires]
    return value
  }
  
  get(key) {
    const [value, expires] = this.store[key]
    if(moment() > expires) {
      delete this.store[key]
      const err = new Error('Expired')
      err.expired_data = value
      throw err
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
      /* dispatch cache-update to the background */
      this.set_async(key, value_callable(), timeout)
      
      /*
       * Prolong the life of the stale data until the "background task" has
       * updated the cache to the new value. This prevents multiple parallel
       * evaluations of `value_callable` upon cache expiration.
       */
      return this.set(key, e.expired_data, timeout)
    }
  }
}

module.exports = new Cache()
