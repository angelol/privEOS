'use strict'

import assert from 'assert'
import Priveos from './index'
import config from './config'
import { uint8array_to_hex } from './helpers'
import uuidv4 from 'uuid/v4'
import eosjs_ecc from 'eosjs-ecc'
const alice = 'priveosalice'
const bob = 'priveosbob11'

const config_alice = {
  dappContract: config.dappContract,
  ...{
    privateKey: '5HrReeu6FhGFWiHW7tsvLLN4dm2TDhizP9B7xWi4emG9RmVfLss',
    publicKey: 'EOS6Zy532Rgkuo1SKjYbPxLKYs8o2sEzLApNu8Ph66ysjstARrnHm', 
  }
}


console.log("config_alice: ", JSON.stringify(config_alice))

var file = uuidv4()
if (process.argv[2]) {
  file = process.argv[2]
}
const a = new Date()
console.log(config_alice)
const priveos_alice = new Priveos({
  ...config_alice
})

function test() {
  // generate ephemeral key
  eosjs_ecc.randomKey().then(ephemeral_key_private => {
    const b = new Date()
    console.log("Time elapsed - random key generation: ", (b-a))
    const ephemeral_key_public = eosjs_ecc.privateToPublic(ephemeral_key_private);
    const config_bob = {
      ...config,
      ...{
        privateKey: '5JqvAdD1vQG3MRAsC9RVzdPJxnUCBNVfvRhL7ZmQ7rCqUoMGrnw',
        publicKey: 'EOS87xyhE6czLCpuF8PaEGc3UiXHHyCMQB2zHygpEsXyDJHadHWFK',
        ephemeralKeyPrivate: ephemeral_key_private,
        ephemeralKeyPublic: ephemeral_key_public,
      }
    }
    const priveos_bob = new Priveos(config_bob)

    // Bob requests access to the file. 
    // This transaction will fail if he is not authorised.
    
    priveos_alice.store(alice, file)
    .then((x) => {
      // throw new Error("ABORT NOW")
      // process.exit(1)
      const c = new Date()
      console.log("\r\nTime elapsed - storing file ", (c-b))
      console.log(`Successfully stored file (${file}), now off to reading.`)
      
      // Bob requests access to the file. 
      // This transaction will fail if he is not authorised.
      console.log(`Push accessgrant action for user ${bob}, contract ${priveos_bob.config.dappContract}, file ${file} and public key ${priveos_bob.config.ephemeralKeyPublic}`)
      priveos_bob.eos.transaction(
        {
          actions: [
            {
              account: priveos_bob.config.priveosContract,
              name: 'accessgrant',
              authorization: [{
                actor: bob,
                permission: 'active',
              }],
              data: {
                user: bob,
                contract: priveos_bob.config.dappContract,
                file,
                public_key: priveos_bob.config.ephemeralKeyPublic,
              }
            }
          ]
        }
      )
      .then(res => {
        /* Wait for eos.transaction to finish before returning result */
        console.log(`\r\nWaiting for transaction to finish`)
        return x
      })
      .then(x => {
        const d = new Date()
        console.log("\r\nTime elapsed - accessgrant transaction", (d-c))
        
        priveos_bob.read(bob, file)
        .then((y) => {
          const e = new Date()
          console.log("d-e", (e-d))
          console.log("a-a", (e-a))
          // console.log('Y: ', y)
          assert.deepStrictEqual(x[0], y[0])
          assert.deepStrictEqual(x[1], y[1])
          
          console.log("Success!")

          console.log("Original key: ", uint8array_to_hex(x[0]))
          console.log("Original nonce: ", uint8array_to_hex(x[1]))
          console.log("Reconstructed key: ", uint8array_to_hex(y[0]))
          console.log("Reconstructed nonce: ", uint8array_to_hex(y[1]))
        })
      })
    })
  })
}
test()