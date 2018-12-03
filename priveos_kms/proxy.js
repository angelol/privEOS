import axios from 'axios'

const encryption_service_url = 'http://127.0.0.1:6000'

class Proxy {
  
  decrypt(payload) {
    return axios.post(encryption_service_url + '/decrypt/', payload)
    .then(res => res.data)
  }
  
  encrypt(payload) {
    return axios.post(encryption_service_url + '/encrypt/', payload)
    .then(res => res.data)
  }
}

export default new Proxy()
