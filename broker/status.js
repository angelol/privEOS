const mongo = require("../common/mongo")
const Eos = require('eosjs')
const eosjs_ecc = require('eosjs-ecc')
const config = require('../common/config')
const { URL } = require('url')
const axios = require('axios')
const encryption_service = require('../kms/proxy')
const ByteBuffer = require('bytebuffer')
const assert = require('assert')
const log = require('loglevel')
log.setDefaultLevel(config.logLevel)

const eos = Eos({httpEndpoint: config.httpEndpoint, chainId: config.chainId})

async function broker_status(req, res) {
  let errors = []
  
  const blocks_behind = await get_blocks_behind()
  if(blocks_behind > 15) {
    errors.push(`Demux index is ${blocks_behind} blocks behind`)
  }
  
  try {
    const kms_status = await get_kms_status()  
    if(kms_status != 'ok') {
      errors.push(`KMS Server returns status ${kms_status}`)
    }  
  } catch(e) {
    errors.push(`Error while trying to connect to KMS Server`)
  }
  
  try { 
    await test_encryption_service()  
  } catch(e) {
    errors.push(`Encryption Service challenge failed`)
  }
  
  const status = errors.length ? "error" : "ok"
  res.send({
    status,
    errors,
  })
}

async function get_blocks_behind() {
  const db = await mongo.db()    
  const index = await db.collection('index_state').findOne()
  const info = await eos.getInfo({})
  return info.head_block_num - index.blockNumber
}

async function get_kms_status() {
  const url = new URL('/kms/status/', `http://127.0.0.1:${config.kmsPort}`).href
  const res = await axios.get(url)
  console.log(`kms_status returned: ${JSON.stringify(res.data)}`)
  return res.data.status
}

async function test_encryption_service() {
  // any key, doesn't matter at all
  const test_key = {
    public: "EOS5y6p5XgxRHXgvVRQ1YnZbKGx8H4GQgYGvENvTLCP1LtKPy1WuB",
    private: "5KLNqMLEHvd3QKaNyEkJK1mhxZgK4937eqGnA8fuVWkCUjr1ZnZ",
  } 
  const test_message = "Test"
  
  const res = await eos.getTableRows({json:true, scope: config.contract, code: config.contract,  table: 'nodes', limit:100})
  const myself = res.rows.filter(x => x.owner == config.nodeAccount)[0]
  log.debug('res.rows: ' + JSON.stringify(myself, null, 2))
  if(!myself) {
    console.info("This node has not been registered, skipping test_encryption_service")
    return
  }
  const share = eosjs_ecc.Aes.encrypt(test_key.private, myself.node_key, test_message)	

  const payload = await encryption_service.reencrypt({
    share: {
      public_key: myself.node_key,
      message: share.message.toString('hex'),
      nonce: String(share.nonce),
      checksum: share.checksum,
    },
    public_key: test_key.public,
    recipient_public_key: test_key.public,
  })
  
  log.debug("payload: ", JSON.stringify(payload))
  
  const decrypted = eosjs_ecc.Aes.decrypt(
    test_key.private, 
    myself.node_key, 
    payload.nonce, 
    ByteBuffer.fromHex(payload.message).toBinary(), 
    payload.checksum
  )	
  log.debug("Decrypted message is: ", String(decrypted))
  assert.equal(test_message, String(decrypted), "Decrypted message does not match")
}
module.exports = { broker_status }