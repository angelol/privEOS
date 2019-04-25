const Backend = require('../common/backend')
const assert = require('assert')
const chains = require('../common/chains')
const encryption_service = require('./proxy')
const getMultiHash = require('../common/multihash')
const log = require('../common/log')

// log.setLevel("debug")

class UserNotAuthorized extends Error {}

async function store(chainId, file, data, owner, dappcontract) {
  const hash = await getMultiHash(data)
  log.debug(`Storing hash ${hash} in local mongo for chain ${chainId}`)
  const chain = chains.get_chain(chainId)
  Backend.store_data(chain, file, data, hash, owner, dappcontract)
}

async function read(chainId, file, requester, dappcontract, data, txid, timeout_seconds) {
  log.debug("Ohai read")
  const chain = chains.get_chain(chainId)
  const [store_trace, accessgrant_trace] = await Promise.all([
    Backend.get_store_trace(chain, dappcontract, file, timeout_seconds),
    Backend.get_accessgrant_trace(chain, dappcontract, requester, file, txid, timeout_seconds),
  ])
  if(!store_trace || !accessgrant_trace) {
    log.error("User is not authorised")
    throw new UserNotAuthorized("User is not authorised")
  }
  log.debug("data.data: ", JSON.stringify(data))
  log.debug("store_trace.data: ", store_trace.data)
  
  const hash = await getMultiHash(JSON.stringify(data))
  assert.equal(store_trace.data, hash)
  const nodes = data.data
  log.debug("DATA: ", JSON.stringify(data, null, 2))
  const my_share = nodes.filter(x => x.node == chain.config.nodeAccount)[0]
  log.debug("my_share: ", JSON.stringify(my_share, null, 2))
  assert.notEqual(null, my_share, "my_share not found!")

  log.debug(`Decrypt for public key ${data.public_key}`)
  
  let user_key
  if(data.public_key) {
    // old format (v0.1.4 and lower)
    // REMOVE_WHEN_MAINNET
    user_key = data.public_key
  } else if(data.user_key) {
    // new format (v0.1.5 and up)
    user_key = data.user_key
  }
  assert.ok(user_key, "No user_key. Invalid Share.")
  
  const share = await encryption_service.reencrypt({
    share: my_share,
    public_key: user_key,
    recipient_public_key: accessgrant_trace.public_key,
    chainId,
  })
  log.debug("share: ", JSON.stringify(share, null, 2))
  let node_key
  if(my_share.public_key) {
    node_key = my_share.public_key
  } else if(my_share.node_key) {
    node_key = my_share.node_key
  }
  return {
    message: share.message,
    node_key,
  }
}

module.exports = {
  UserNotAuthorized,
  store,
  read
}
