import Promise from 'bluebird'
import Backend from '../common/backend'
import assert from 'assert'
import config from '../common/config'
import encryption_service from './proxy'

class UserNotAuthorized extends Error {}

export default class KMS {
  constructor(config) {
    this.config = config
  }
      
  read(file, requester, dappcontract) {
    return Promise.all([
  		Backend.get_store_trace(dappcontract, file),
  		Backend.get_accessgrant_trace(dappcontract, requester, file),
  	])    
    .then(([store_trace, accessgrant_trace]) => {
      if(!store_trace || !accessgrant_trace) {
  			throw new UserNotAuthorized("User is not authorised")
  		}
      const data = JSON.parse(store_trace.data)
  		const nodes = data.data
  		console.log("DATA: ", JSON.stringify(data, null, 2))
  		// console.log("Original nodes: ", JSON.stringify(nodes))
  		const my_share = nodes.filter(x => x.node == this.config.nodeAccount)[0]
  		console.log("my_share: ", JSON.stringify(my_share, null, 2))
  		assert.notEqual(null, my_share, "my_share not found!")

      console.log(`Decrypt for public key ${data.public_key}`)
      
      return encryption_service.reencrypt({
        public_key: data.public_key,
        message: my_share.message,
        nonce: my_share.nonce,
        checksum: my_share.checksum,
        recipient_public_key: accessgrant_trace.public_key,
      })
      .then(share => {
        return {
          message: share.message,
          nonce: String(share.nonce),
          checksum: share.checksum,
          public_key: my_share.public_key,
        }
      })
  	})
  }
}
KMS.UserNotAuthorized = UserNotAuthorized
