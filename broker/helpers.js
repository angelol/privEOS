const Eos = require('eosjs')
const log = require('../common/log')
const config = require('../common/config')
const ipfsClient = require('ipfs-http-client')
global.Promise = require('bluebird')



const chainConnectors = config.chains.map(chainConfig => {
  // console.log('chainConfig', chainConfig, chainConfig.watchdogPermission.key)
  return {
    eos: Eos({
      httpEndpoint: chainConfig.httpEndpoint, 
      chainId: chainConfig.chainId,
      keyProvider: [chainConfig.watchdogPermission.key],
    }),
    config: chainConfig
  }
})

function get_chain(chainId) {
  const chain = chainConnectors.find(el => {
    return el.config.chainId == chainId
  })
  return chain.length > 0 && chain[0] || null
}
   
async function all_nodes(chainId) {
  const chain = get_chain(chainId)
  const res = await chain.eos.getTableRows({json:true, scope: config.contract, code: config.contract, table: 'nodes', limit:100})
  return res.rows.filter(x => x.is_active)
}

async function get_nodes(payload, dappcontract, file) {
  const nodes = payload.data
  const owners = nodes.map(value => value.node)
  const active_nodes = await all_nodes()
  return active_nodes.filter(x => owners.includes(x.owner))
}

async function fetch_from_ipfs(hash) {
  const ipfs = ipfsClient(config.ipfsConfig.host, config.ipfsConfig.port, {'protocol': config.ipfsConfig.protocol})
  log.debug("Ohai fetch_from_ipfs")
  const result = await ipfs.get(`/ipfs/${hash}`).timeout(1000, `Retrieving from ipfs should not block if data is pinned locally. Hash: ${hash}`)
  log.debug("ipfs result: ", result[0])
  return result[0].content.toString('utf8')
}

module.exports = {
  get_chain,
  get_nodes,
  all_nodes,
  fetch_from_ipfs,
}