const axios = require('axios')
const { encryptionServiceUrl } = require('../common/config')

class Proxy {
  async reencrypt(payload) {
    const res = await axios.post(encryptionServiceUrl + '/reencrypt/', payload)
    return res.data
  }
}

module.exports = new Proxy()
