import axios from 'axios'

const encryption_service_url = 'http://127.0.0.1:6000'

class Proxy {
  reencrypt(payload) {
    return axios.post(encryption_service_url + '/reencrypt/', payload)
    .then(res => res.data)
  }
}

export default new Proxy()
