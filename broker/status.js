const eosjs_ecc = require('eosjs-ecc-priveos')
const config = require('../common/config')
const chains = require('../common/chains')
const { URL } = require('url')
const axios = require('axios')
const encryption_service = require('../kms/proxy')
const ByteBuffer = require('bytebuffer')
const assert = require('assert')
const ipfsClient = require('ipfs-http-client')
const { version } = require('../package.json')
const log = require('../common/log')

async function broker_status(req, res) {
  const start = new Date()
  let errors = []
  let warnings = []
  
  const [
    kms_status,
    ipfs_status,
    info,
    watchdog_status,
  ] = await Promise.all([
    wrap(get_kms_status)(),
    wrap(check_ipfs)(),
    wrap(get_info)(),
    wrap(check_watchdog)(),
  ])

  const chain_specific_tests = await Promise.all(chains.adapters.map(async chain => {
    const blocks_behind = await wrap(get_blocks_behind)(chain)
    const encryption_service_status = await wrap(test_encryption_service)(chain)

    return {
      chainId: chain.config.chainId,
      blocks_behind,
      encryption_service_status
    }
  }))
  
  
  const chain_infos = chain_specific_tests.map(info => {
    let result = {
      chainId: info.chainId,
      info: {
        index_head: info.blocks_behind.head
      },
      errors: []
    }
    if(info.blocks_behind.error) {
      throw info.blocks_behind.error
    } else if(info.blocks_behind.delay > 15) {
      result.errors.push(`Demux index is ${info.blocks_behind.delay} blocks behind`)
    }

    if(info.encryption_service_status.error) {
      log.error(`Encryption Service challenge failed with error ${info.encryption_service_status.error}`)
      result.errors.push(`Encryption Service challenge failed`)
    }

    return result
  })
  
  if(kms_status.error) {
    log.error(`Error while trying to connect to KMS Server: ${kms_status.error}`)
    errors.push(`Error while trying to connect to KMS Server`)
  } else if(kms_status != 'ok') {
    log.error(`KMS Server returns status ${kms_status}`)
    errors.push(`KMS Server returns status ${kms_status}`)
  } 

  if(ipfs_status.error) {
    log.error(`IPFS error ${ipfs_status.error}`)
    errors.push(`IPFS challenge failed`)
  }
  
  if(info.error) {
    log.error(`Error while getting info: ${info.error}`)
    errors.push(`Error while getting info`)
  }

  if(watchdog_status.error) {
    log.error(`Watchdog error: ${watchdog_status.error}`)
    warnings.push(`Watchdog not running`)
  } else if(watchdog_status != 'ok') {
    log.error(`Watchdog returned status: ${watchdog_status}`)
    warnings.push(`Watchdog Error: ${watchdog_status}`)
  }
  
  const end = new Date()
  info['duration'] = end-start
  
  let status = errors.length ? "error" : "ok"
  let data = {
    status,
    info,
    chains: chain_infos
  }
  if(errors.length) {
    data['errors'] = errors
  }
  if(warnings.length) {
    data['warnings'] = warnings
  }
  
  res.send(data)
}

async function get_info() {
  return {
    version,
  }
}

/* Checks */
async function get_blocks_behind(chain) {
  const db = await chain.mongo.db()
  const index = await db.collection('index_state').findOne()
  const info = await chain.eos.getInfo({})
  return {
    head: index.blockNumber,
    delay: info.head_block_num - index.blockNumber,
  }
}
 
async function get_kms_status() {
  const url = new URL('/kms/status/', `http://127.0.0.1:${config.kmsPort}`).href
  const res = await axios.get(url)
  log.debug(`kms_status returned: ${JSON.stringify(res.data)}`)
  return res.data.status
}

async function test_encryption_service(chain) {
  // any key, doesn't matter at all
  const test_key = {
    public: "EOS5y6p5XgxRHXgvVRQ1YnZbKGx8H4GQgYGvENvTLCP1LtKPy1WuB",
    private: "5KLNqMLEHvd3QKaNyEkJK1mhxZgK4937eqGnA8fuVWkCUjr1ZnZ",
  } 
  const test_message = "Test"
  

  const res = await chain.eos.getTableRows({json:true, scope: chain.config.contract, code: chain.config.contract, table: 'nodes', limit:100})
  const myself = res.rows.filter(x => x.owner == chain.config.nodeAccount)[0]
  log.debug('res.rows: ' + JSON.stringify(myself, null, 2))
  if(!myself) {
    console.info("This node has not been registered, skipping test_encryption_service")
    return
  }
  let share = eosjs_ecc.Aes.encrypt(test_key.private, myself.node_key, test_message)	
  share = share.toString('base64')
  const payload = await encryption_service.reencrypt({
    share: {
      node_key: myself.node_key,
      share,
    },
    public_key: test_key.public,
    recipient_public_key: test_key.public,
    chainId: chain.config.chainId,
  })
  
  log.debug("payload: ", JSON.stringify(payload))
  
  const decrypted = eosjs_ecc.Aes.decrypt(
    test_key.private, 
    myself.node_key, 
    Buffer.from(payload.message, 'base64'),
  )	
  log.debug("Decrypted message is: ", String(decrypted))
  assert.equal(test_message, String(decrypted), "Decrypted message does not match")
}

async function check_ipfs() {
  const ipfs = ipfsClient(config.ipfsConfig.host, config.ipfsConfig.port, {'protocol': config.ipfsConfig.protocol})
  await ipfs.get('/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/quick-start').timeout(1000, "Timeout while ipfs.get")
}

async function check_watchdog() {
  const port = config.watchdogPort || 3101
  const url = new URL('/watchdog/status/', `http://127.0.0.1:${port}`).href
  const res = await axios.get(url)
  return res.data.status
}

/**
  * Function wrapper to gracefully handle exceptions inside Promise.all
  * This is needed because Promise.all aborts when any promise rejects.
  */
function wrap(fun) {
  return async (...args) => {
    try {
      return (await fun(...args)) || {}
    } catch(error) {
      return {error}
    }
  }
}

module.exports = { broker_status }