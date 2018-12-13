import Backend from '../common/backend'
import assert from 'assert'
import config from '../common/config'
import encryption_service from './proxy'
import getMultiHash from '../common/multihash'

class UserNotAuthorized extends Error {}

export default class KMS {
  constructor(config) {
    this.config = config
  }
  
  async store(file, data, owner, dappcontract) {
    const hash = await getMultiHash(data)
    Backend.store_data(file, data, hash, owner, dappcontract)
  }
      
  async read(file, requester, dappcontract) {
    const [store_trace, accessgrant_trace] = await Promise.all([
  		Backend.get_store_trace(dappcontract, file),
  		Backend.get_accessgrant_trace(dappcontract, requester, file),
  	])    
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
    
    const share = await encryption_service.reencrypt({
      share: my_share,
      public_key: data.public_key,
      recipient_public_key: accessgrant_trace.public_key,
    })
    return {
      message: share.message,
      nonce: String(share.nonce),
      checksum: share.checksum,
      public_key: my_share.public_key,
    }
  }
}
KMS.UserNotAuthorized = UserNotAuthorized
