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
import { get_threshold, hex_to_uint8array } from './helpers.js'
import defaultConfig from './config'
import Eos from 'eosjs'

export default class Priveos {
  constructor(config) {
    if (!config) throw new Error('Instantiating Priveos requires config object')
    if (!config.privateKey) throw new Error('Instantiating Priveos requires a private key set')

    this.config = {
      ...defaultConfig,
      ...config
    }
    this.eos = Eos({httpEndpoint:this.config.httpEndpoint, chainId: this.config.chainId, keyProvider: [this.config.privateKey]})
  }

  store(owner, file) {
    assert.ok(owner && file, "Owner and file must be supplied")
    const secret_bytes = nacl.randomBytes(nacl.secretbox.keyLength)
    const nonce_bytes = nacl.randomBytes(nacl.secretbox.nonceLength)
    const secret = Buffer.from(secret_bytes).toString('hex')
    const nonce = Buffer.from(nonce_bytes).toString('hex')
    console.log("Secret: ", secret)
    console.log("Nonce: ", nonce)
    const shared_secret = secret + nonce
    console.log("shared_secret: ", shared_secret)
    
    return this.get_active_nodes()
    .then((nodes) => {
      console.log("Nodes: ", nodes)
      const number_of_nodes = nodes.length
      const threshold = get_threshold(number_of_nodes)
      const shares = secrets.share(shared_secret, number_of_nodes, threshold)
      console.log("Shares: ", shares)
      var data = nodes.map(node => {
        const public_key = node.node_key
        console.log(`eosjs_ecc.Aes.encrypt this.config.privateKey: "${this.config.privateKey}"`)
        console.log(`public_key: ${public_key}`)
        const share = eosjs_ecc.Aes.encrypt(this.config.privateKey , public_key, shares.pop())
        
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
        threshold: threshold,
        public_key: this.config.publicKey,
      }
    })
    .then((data) => {
      console.log("Constructed this (data): ", JSON.stringify(data))
      console.log("this.config.priveosContract: ", this.config.priveosContract)
      console.log("this.config.dappContract: ", this.config.dappContract)
      console.log("owner: ", owner)
      return this.eos.transaction(
        {
          actions: [
            {
              account: this.config.priveosContract,
              name: 'store',
              authorization: [{
                actor: owner,
                permission: 'active',
              }],
              data: {
                owner: owner,
                contract: this.config.dappContract,
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
    })
  } 

  read(owner, file) {
    return axios.post(this.config.brokerUrl + '/read/', {
      file: file,
      requester: owner
    }).then(response => {
      const shares = response.data
      console.log("Shares: ", shares)
      
      
      const decrypted_shares = shares.map((data) => {
        console.log("DATA: ", JSON.stringify(data))
        console.log("Bob private: ", this.config.privateKey)
        console.log("Alice public: ", data.public_key)
        return String(eosjs_ecc.Aes.decrypt(this.config.privateKey, data.public_key, data.nonce, ByteBuffer.fromHex(data.message).toBinary(), data.checksum))
      })
      console.log("decrypted_shares: ", decrypted_shares)
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
      const key_buffer = hex_to_uint8array(combined_hex_key)
      const nonce_buffer = hex_to_uint8array(combined_hex_nonce)
      return [key_buffer, nonce_buffer]
    })
  }
  
  get_active_nodes(){
    return this.eos.getTableRows({json:true, scope: this.config.priveosContract, code: this.config.priveosContract,  table: 'nodes', limit:100})
    .then((res) => {
      return res.rows.filter((x) => {
        return x.is_active
      })
    })
  }
}