import eosjs_ecc from 'eosjs-ecc'
import ByteBuffer from 'bytebuffer'

import { get_store_trace } from '../common/mongo'
import { check_permissions } from './helpers'

import assert from 'assert'

export default class KMS {
  constructor(config) {
    this.config = config
  }
  
  read(file, requester, dappcontract) {
    const context = {}
    return get_store_trace(dappcontract, file)
    .then((data) => {
  		const nodes = data.data
  		console.log("DATA: ", JSON.stringify(data, null, 2))
  		// console.log("Original nodes: ", JSON.stringify(nodes))
  		context.my_share = nodes.filter(x => x.node == this.config.nodeAccount)[0]
  		console.log("my_share: ", JSON.stringify(context.my_share, null, 2))
  		assert.notEqual(null, context.my_share, "my_share not found!")
  		
  		// decrypt using the private key of my node
  		console.log(`Decrypt for public key ${data.public_key}`)
  		context.plaintext = eosjs_ecc.Aes.decrypt(this.config.privateKey, data.public_key, context.my_share.nonce, ByteBuffer.fromHex(context.my_share.message).toBinary(), context.my_share.checksum)
  	})
    .then(_ => {
      return check_permissions(requester, file)
    })
    .then(recipient_public_key => {
      console.log("User is authorised, continuing")
      // encrypt using the public_key of the requester
      // so only the requester will be able to decrypt with his private key
      const share = eosjs_ecc.Aes.encrypt(this.config.privateKey, recipient_public_key, String(context.plaintext))	
      // console.log("Share: ", JSON.stringify(share))			
      return {
        message: share.message.toString('hex'),
        nonce: String(share.nonce),
        checksum: share.checksum,
        public_key: context.my_share.public_key,
      }
    })
  }
}