const Backend = require('../common/backend')
const assert = require('assert')
const config = require('../common/config')
const encryption_service = require('./proxy')
const getMultiHash = require('../common/multihash')
const log = require('loglevel')
log.setDefaultLevel(config.logLevel)

class UserNotAuthorized extends Error {}

class KMS {
  constructor(config) {
    this.config = config
  }
  
  async store(file, data, owner, dappcontract) {
    const hash = await getMultiHash(data)
    log.debug(`Storing hash ${hash} in local mongo`)
    Backend.store_data(file, data, hash, owner, dappcontract)
  }
      
  async read(file, requester, dappcontract, data) {
    log.debug("Ohai read")
    const [store_trace, accessgrant_trace] = await Promise.all([
  		Backend.get_store_trace(dappcontract, file),
  		Backend.get_accessgrant_trace(dappcontract, requester, file),
  	])    
    if(!store_trace || !accessgrant_trace) {
      log.error("User is not authorised")
			throw new UserNotAuthorized("User is not authorised")
		}
    log.debug("data.data: ", JSON.stringify(data))
    log.debug("store_trace.data: ", store_trace.data)
    
    const hash = await getMultiHash(JSON.stringify(data))
    assert.equal(store_trace.data, hash)
    // const data = JSON.parse(store_trace.data)
		const nodes = data.data
		log.debug("DATA: ", JSON.stringify(data, null, 2))
		const my_share = nodes.filter(x => x.node == this.config.nodeAccount)[0]
		log.debug("my_share: ", JSON.stringify(my_share, null, 2))
		assert.notEqual(null, my_share, "my_share not found!")

    log.debug(`Decrypt for public key ${data.public_key}`)
    
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

module.exports = KMS
