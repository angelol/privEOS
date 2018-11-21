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
import Eos from 'eosjs'

export default class Priveos {
  constructor(config) {
    if (!config) throw new Error('Instantiating Priveos requires config object')
    if (!config.privateKey && !config.eos) throw new Error('Instantiating Priveos requires either config.privateKey or config.eos proxy instance (e.g. scatter)')
    if (config.privateKey && !config.publicKey) throw new Error('When passing config.privateKey the related config.publicKey must be present too')
    if (config.ephemeralKeyPrivate && !config.ephemeralKeyPublic) throw new Error('When passing config.ephemeralKeyPrivate the related config.ephemeralKeyPublic must be present too')
    if (!config.dappContract) throw new Error('Instantiating Priveos requires a dappContract set')

    this.config = config
    
    if (this.config.privateKey) {
      this.eos = Eos({httpEndpoint:this.config.httpEndpoint, chainId: this.config.chainId, keyProvider: [this.config.privateKey]})
    } else {
      this.eos = this.config.eos
    }
    
    if(!this.config.priveosContract) {
      this.config.priveosContract = 'priveosrules'
    }
  }

  /**
   * Generate a new symmetric secret + nonce to encrypt files
   */
  get_encryption_keys() {
    const secret_bytes = nacl.randomBytes(nacl.secretbox.keyLength)
    const nonce_bytes = nacl.randomBytes(nacl.secretbox.nonceLength)
    console.log("Secret (bytes): ", JSON.stringify(secret_bytes))
    console.log("Nonce (bytes): ", JSON.stringify(nonce_bytes))
    return {
      secret_bytes,
      nonce_bytes
    }
  }

  /**
   * Trigger a store transaction at priveos level alongside the passed actions
   * @param {string} owner 
   * @param {string} file 
   * @param {Uint8Array} secret_bytes 
   * @param {Uint8Array} nonce_bytes 
   * @param {array} actions Additional actions to trigger alongside store transaction (usability)
   */
  store(owner, file, secret_bytes, nonce_bytes, actions = []) {
    console.log(`\r\n###\r\npriveos.store(${owner}, ${file})`)
    
    assert.ok(owner && file, "Owner and file must be supplied")
    assert.ok(secret_bytes && nonce_bytes, "secret_bytes and nonce_bytes must be supplied (run priveos.get_encryption_keys() before)")

    const secret = Buffer.from(secret_bytes).toString('hex')
    const nonce = Buffer.from(nonce_bytes).toString('hex')
    const shared_secret = secret + nonce

    console.log("shared_secret: ", shared_secret)
    console.log("Secret: ", secret)
    console.log("Nonce: ", nonce)
    console.log("shared_secret: ", shared_secret)
    
    return this.get_active_nodes()
    .then((nodes) => {
      console.log("\r\nNodes: ", nodes)

      const number_of_nodes = nodes.length
      const threshold = get_threshold(number_of_nodes)
      const shares = secrets.share(shared_secret, number_of_nodes, threshold)

      console.log("Shares: ", shares)

      const keys = this.get_config_keys()

      var data = nodes.map(node => {
        const public_key = node.node_key

        console.log(`\r\nNode ${node.owner}`)

        const share = eosjs_ecc.Aes.encrypt(keys.private , public_key, shares.pop())
        
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
        public_key: keys.public,
      }
    })
    .then((data) => {
      console.log("\r\nBundling... ")
      console.log("Constructed this (data): ", JSON.stringify(data))
      console.log("this.config.priveosContract: ", this.config.priveosContract)
      console.log("this.config.dappContract: ", this.config.dappContract)
      console.log("owner: ", owner)
      return this.eos.transaction(
        {
          actions: actions.concat([
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
          ])
        }
      )
    })
  } 
  
  async accessgrant(user, file, token_symbol, actions = []) {
    console.log(`accessgrant user: ${user}`)
    return this.eos.transaction({
      actions: actions.concat(
        [
          {
            account: this.config.priveosContract,
            name: 'prepare',
            authorization: [{
              actor: user,
              permission: 'active',
            }],
            data: {
              user: user,
              currency: token_symbol,
            }
          },
          {
            account: "eosio.token",
            name: 'transfer',
            authorization: [{
              actor: user,
              permission: 'active',
            }],
            data: {
              from: user,
              to: this.config.priveosContract,
              quantity: await this.get_priveos_fee(token_symbol),
              memo: "PrivEOS fee",
            }
          },
          {
            account: this.config.priveosContract,
            name: 'accessgrant',
            authorization: [{
              actor: user,
              permission: 'active',
            }],
            data: {
              user: user,
              contract: this.config.dappContract,
              file,
              public_key: this.config.ephemeralKeyPublic,
              token: token_symbol,
            }
          }
        ]
      )
    })
  }
  
  get_priveos_fee(token) {
    if(token.indexOf(",") != -1) {
      token = token.split(",")[1]
    }
    return this.eos.getTableRows({json:true, scope: 'priveosrules', code: 'priveosrules',  table: 'price', limit:1, lower_bound: token})
    .then((res) => {
      console.log('get_priveos_fee: ', res.rows[0].money)
      return res.rows[0].money
    })
  }

  read(owner, file) {
    return axios.post(this.config.brokerUrl + '/read/', {
      file: file,
      requester: owner,
      dappcontract: this.config.dappContract,
    }).then(response => {
      const shares = response.data
      console.log("Shares: ", shares)
      
      const read_key = this.get_config_keys()
      
      const decrypted_shares = shares.map((data) => {
        return String(eosjs_ecc.Aes.decrypt(read_key.private, data.public_key, data.nonce, ByteBuffer.fromHex(data.message).toBinary(), data.checksum))
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
  
  /**
   * Return the keys passed when instantiating priveos
   */
  get_config_keys() {
    if(this.config.ephemeralKeyPublic && this.config.ephemeralKeyPrivate) {
      return {
        public: this.config.ephemeralKeyPublic,
        private: this.config.ephemeralKeyPrivate
      }
    } else {
      return {
        public: this.config.publicKey,
        private: this.config.privateKey,
      }
    }
  }
}