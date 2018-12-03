import eosjs_ecc from 'eosjs-ecc'
import ByteBuffer from 'bytebuffer'
import Eos from 'eosjs'
import Promise from 'bluebird'
import Backend from '../common/backend'
import assert from 'assert'
import config from '../common/config'
import encryption_service from './proxy'

const eos = Eos({httpEndpoint: config.httpEndpoint, chainId: config.chainId})

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
      
      // this is the (ephemeral) public key of the recipient
  		const recipient_public_key = accessgrant_trace.public_key
      
  		// decrypt using the private key of my node
      encryption_service.decrypt({
        public_key: data.public_key,
        message: my_share.message,
        nonce: my_share.nonce,
        checksum: my_share.checksum,
      })
      .then(plaintext => {
        console.log("encryption_service.decrypt resolved: ", plaintext)
        
        // // encrypt using the public_key of the requester
        // // so only the requester will be able to decrypt with his private key
        encryption_service.encrypt({
          public_key: recipient_public_key,
          plaintext: String(plaintext),
        })
        .then(share => {
          return {
            message: share.message.toString('hex'),
            nonce: String(share.nonce),
            checksum: share.checksum,
            public_key: my_share.public_key,
          }
        })
      })
  		// const plaintext = eosjs_ecc.Aes.decrypt(this.config.privateKey, data.public_key, my_share.nonce, ByteBuffer.fromHex(my_share.message).toBinary(), my_share.checksum)
      
      
      
      // console.log("User is authorised, continuing")
      // console.log("recipient_public_key: ", recipient_public_key)
      // // encrypt using the public_key of the requester
      // // so only the requester will be able to decrypt with his private key
      // const share = eosjs_ecc.Aes.encrypt(this.config.privateKey, recipient_public_key, String(plaintext))	
      // // console.log("Share: ", JSON.stringify(share))			
      // return {
      //   message: share.message.toString('hex'),
      //   nonce: String(share.nonce),
      //   checksum: share.checksum,
      //   public_key: my_share.public_key,
      // }
  	})
  }
}
KMS.UserNotAuthorized = UserNotAuthorized
