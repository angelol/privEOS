const mongo = require("../common/mongo")
const Eos = require('eosjs')
const eosjs_ecc = require('eosjs-ecc')
const config = require('../common/config')
const { URL } = require('url')
const axios = require('axios')
const encryption_service = require('../kms/proxy')
const ByteBuffer = require('bytebuffer')
const assert = require('assert')
const ipfsClient = require('ipfs-http-client')
const { version } = require('../package.json')
const log = require('loglevel')
log.setDefaultLevel(config.logLevel)

const eos = Eos({httpEndpoint: config.httpEndpoint, chainId: config.chainId})

async function broker_status(req, res) {
  const start = new Date()
  let errors = []
  
  const [
    blocks_behind,
    kms_status,
    encryption_service_status,
    ipfs_status,
    info,
  ] = await Promise.all([
    wrap(get_blocks_behind)(),
    wrap(get_kms_status)(),
    wrap(test_encryption_service)(),
    wrap(check_ipfs)(),
    wrap(get_info)(),
  ])
  
  if(blocks_behind.error) {
    throw blocks_behind.error
  } else if(blocks_behind > 15) {
    errors.push(`Demux index is ${blocks_behind} blocks behind`)
  }
  
  if(kms_status.error) {
    console.error(`Error while trying to connect to KMS Server: ${kms_status.error}`)
    errors.push(`Error while trying to connect to KMS Server`)
  } else if(kms_status != 'ok') {
    errors.push(`KMS Server returns status ${kms_status}`)
  } 
  
  if(encryption_service_status.error) {
    console.error(`Encryption Service challenge failed with error ${encryption_service_status.error}`)
    errors.push(`Encryption Service challenge failed`)
  }

  if(ipfs_status.error) {
    console.error(`IPFS error ${ipfs_status.error}`)
    errors.push(`IPFS challenge failed`)
  }
  
  if(info.error) {
    console.error(`Error while getting info: ${info.error}`)
    errors.push(`Error while getting info`)
  }
  
  const end = new Date()
  info['duration'] = end-start
  
  let status = errors.length ? "error" : "ok"
  let data = {
    status,
    info,
  }
  if(errors.length) {
    data['errors'] = errors
  }
  
  res.send(data)
}

async function get_info() {
  return {
    version,
  }
}

/* Checks */
async function get_blocks_behind() {
  const db = await mongo.db()    
  const index = await db.collection('index_state').findOne()
  const info = await eos.getInfo({})
  return info.head_block_num - index.blockNumber
}

async function get_kms_status() {
  const url = new URL('/kms/status/', `http://127.0.0.1:${config.kmsPort}`).href
  const res = await axios.get(url)
  log.debug(`kms_status returned: ${JSON.stringify(res.data)}`)
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

async function check_ipfs() {
  const ipfs = ipfsClient(config.ipfsConfig.host, config.ipfsConfig.port, {'protocol': config.ipfsConfig.protocol})
  await ipfs.get('/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/quick-start').timeout(1000, "Timeout while ipfs.get")
}

function wrap(fun) {
  return async () => {
    try {
      return (await fun()) || {}
    } catch(error) {
      return {error}
    }
  }
}

module.exports = { broker_status }