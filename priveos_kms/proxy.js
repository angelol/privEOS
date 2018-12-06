import axios from 'axios'
import { encryptionServiceUrl } from '../common/config'

class Proxy {
  async reencrypt(payload) {
    const res = await axios.post(encryptionServiceUrl + '/reencrypt/', payload)
    return res.data
  }
}

export default new Proxy()
