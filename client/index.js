'use strict'
import nacl from 'tweetnacl'
import secrets from 'secrets.js-grempe'
import util from 'tweetnacl-util'
nacl.util = util
import assert from 'assert'
import axios from 'axios'
axios.defaults.timeout = 2500;
import ByteBuffer from 'bytebuffer'
import eosjs_ecc from 'eosjs-ecc'
import { get_active_nodes, get_threshold, EosWrapper } from './helpers.js'
import defaultConfig from './config'

const nonceLength = 16

export default class Priveos {
  constructor(config) {
    if (!config) throw new Error('Instantiating Priveos requires config object')
    if (!config.key) throw new Error('Instantiating Priveos requires a private key set')

    this.config = {
      ...defaultConfig,
      ...config
    }
    this.eosWrapper = new EosWrapper(this.config)


  }

  store(owner, file) {
    const self = this
    assert.ok(owner && file, "Owner and file must be supplied")
    const secret_bytes = nacl.randomBytes(nacl.secretbox.keyLength)
    const nonce_bytes = nacl.randomBytes(nacl.secretbox.nonceLength)
    const secret = Buffer.from(secret_bytes).toString('hex')
    const nonce = Buffer.from(nonce_bytes).toString('hex')
    console.log("Secret: ", secret)
    console.log("Nonce: ", nonce)
    const shared_secret = secret + nonce
    console.log("shared_secret: ", shared_secret)
    
    return this.eosWrapper.get_active_nodes()
    .then((nodes) => {
      console.log("Nodes: ", nodes)
      const number_of_nodes = nodes.length
      const threshold = get_threshold(number_of_nodes)
      const shares = secrets.share(shared_secret, number_of_nodes, threshold)
      console.log("Shares: ", shares)
      var data = nodes.map(function(node) {
        const public_key = node.node_key
        console.log(self.config.key)
        const share = eosjs_ecc.Aes.encrypt(self.config.key, public_key, shares.pop())
        
        return {
          node: node.owner, 
          message: share.message.toString('hex'),
          nonce: String(share.nonce),
          checksum: share.checksum,
          public_key: public_key,
        }
      })
      return {
        data: data,
        threshold: threshold
      }
    })
    .then((data) => {
      console.log("Constructed this (data): ", JSON.stringify(data))
      console.log('this.config.contract', this.config.contract, owner)
      return this.eosWrapper.eos.transaction(
        {
          actions: [
            {
              account: this.config.contract,
              name: 'store',
              authorization: [{
                actor: owner,
                permission: 'active',
              }],
              data: {
                owner: owner,
                contract: this.config.contract,
                file: file,
                data: JSON.stringify(data),
              }
            }
          ]
        }
      )
    })
    .then((data) => {
      console.log("Successfully stored in blockchain txid: ", data.transaction_id)
      return [secret_bytes, nonce_bytes]
    }).catch((e) => {
      console.log("Error ", e)
    })
    
  } 

  read(owner, file, private_key) {
    return axios.post('http://localhost:4000/read/', {
      file: file,
      requester: owner
    }).then(function (response) {
      const shares = response.data
      console.log("Shares: ", shares)
      
      
      const decrypted_shares = shares.map((data) => {
        return String(eosjs_ecc.Aes.decrypt(private_key, data.public_key, data.nonce, ByteBuffer.fromHex(data.message).toBinary(), data.checksum))
      })
      return decrypted_shares
    })
    .then((decrypted_shares) => {
      return secrets.combine(decrypted_shares)
    })
    .then((combined) => {
      console.log("Combined: ", combined)
      const combined_hex_key = combined.slice(0, nacl.secretbox.keyLength*2)
      const combined_hex_nonce = combined.slice(nacl.secretbox.keyLength*2)
      console.log("Hex key: ", combined_hex_key)
      console.log("Nonce: ", combined_hex_nonce)
      const key_buffer = new Uint8Array(ByteBuffer.fromHex(combined_hex_key).toArrayBuffer())
      
      const nonce_buffer = new Uint8Array(ByteBuffer.fromHex(combined_hex_nonce).toArrayBuffer())
      return [key_buffer, nonce_buffer]
    })
    .catch(function (error) {
      console.log(error)
    })
    
  }
}