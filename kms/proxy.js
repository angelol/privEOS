const axios = require('axios')
const { encryptionServiceUrl } = require('../common/config')
const { URL } = require('url')

class Proxy {
  async reencrypt(payload) {
    const url = new URL('/reencrypt/', encryptionServiceUrl).href
    const res = await axios.post(url, payload)
    return res.data
  }
}

module.exports = new Proxy()
