'use strict'

import assert from 'assert'
import Priveos from './index'
import config from './config-test'

const owner = 'angelo'
var file = 'file'
if (process.argv[2]) {
  file = process.argv[2]
}
const a = new Date()
const priveos = new Priveos(config)

function test() {
  priveos.store(owner, file)
  .then((x) => {
    const b = new Date()
    console.log("a-b ", (b-a))
    console.log("Successfully stored file, now off to reading.")
    
    priveos.eos.transaction(
      {
        actions: [
          {
            account: priveos.config.contract,
            name: 'accessgrant',
            authorization: [{
              actor: owner,
              permission: 'active',
            }],
            data: {
              user: owner,
              contract: priveos.config.contract,
              file: file,
            }
          }
        ]
      }
    ).then(res => {
      /* Wait for eos.transaction to finish before returning result */
      return x
    })
    .then(x => {
      const c = new Date()
      console.log("c-b", (c-b))
      
      priveos.read(owner, file)
      .then((y) => {
        const d = new Date()
        console.log("d-c", (d-c))
        console.log("d-a", (d-a))
        // console.log('Y: ', y)
        assert.deepStrictEqual(x[0], y[0])
        assert.deepStrictEqual(x[1], y[1])
        
        console.log("Success!")

        // console.log("Original key: ", x[0])
        // console.log("Original nonce: ", x[1])
        // console.log("Reconstructed key: ", y[0])
        // console.log("Reconstructed nonce: ", y[1])
      })
    })
  })
  
}
test()