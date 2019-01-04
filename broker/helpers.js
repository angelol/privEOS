const Eos = require('eosjs')
const config = require('../common/config')
const ipfsClient = require('ipfs-http-client')
global.Promise = require('bluebird')
const log = require('loglevel')
log.setDefaultLevel(config.logLevel)

const eos = Eos({httpEndpoint: config.httpEndpoint, chainId: config.chainId})
   
async function all_nodes() {
  const res = await eos.getTableRows({json:true, scope: config.contract, code: config.contract,  table: 'nodes', limit:100})
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
  const result = await ipfs.get(`/ipfs/${hash}`).timeout(1000, "Retrieving from ipfs should not block if data is pinned locally")
  log.debug("ipfs result: ", result[0])
  return result[0].content.toString('utf8')
}

module.exports = {
  get_nodes,
  all_nodes,
  fetch_from_ipfs,
}