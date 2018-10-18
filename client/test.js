'use strict'

import assert from 'assert'
import Priveos from './index'
import config from './config-test'
import { uint8array_to_hex } from './helpers'
import uuidv4 from 'uuid/v4'
const alice = 'priveosalice'
const bob = 'priveosbob11'

const config_alice = {
  ...config,
  ...{
    privateKey: '5HrReeu6FhGFWiHW7tsvLLN4dm2TDhizP9B7xWi4emG9RmVfLss',
    publicKey: 'EOS6Zy532Rgkuo1SKjYbPxLKYs8o2sEzLApNu8Ph66ysjstARrnHm', 
  }
}

const config_bob = {
  ...config,
  ...{
    privateKey: '5JqvAdD1vQG3MRAsC9RVzdPJxnUCBNVfvRhL7ZmQ7rCqUoMGrnw',
    publicKey: 'EOS87xyhE6czLCpuF8PaEGc3UiXHHyCMQB2zHygpEsXyDJHadHWFK',
  }
}

console.log("config_alice: ", JSON.stringify(config_alice))

var file = uuidv4()
if (process.argv[2]) {
  file = process.argv[2]
}
const a = new Date()
const priveos_alice = new Priveos(config_alice)
const priveos_bob = new Priveos(config_bob)

function test() {
  priveos_alice.store(alice, file)
  .then((x) => {
    const b = new Date()
    console.log("a-b ", (b-a))
    console.log("Successfully stored file, now off to reading.")
    
    // Bob requests access to the file. 
    // This transaction will fail if he is not authorised.
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
              file: file,
              public_key: priveos_bob.config.publicKey,
            }
          }
        ]
      }
    )
    .then(res => {
      /* Wait for eos.transaction to finish before returning result */
      return x
    })
    .then(x => {
      const c = new Date()
      console.log("c-b", (c-b))
      
      priveos_bob.read(bob, file)
      .then((y) => {
        const d = new Date()
        console.log("d-c", (d-c))
        console.log("d-a", (d-a))
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
    .catch(err => {
      console.log(err)
    })
  })
}
test()