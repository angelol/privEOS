const Eos = require('eosjs')
const config = require('../common/config')
const ipfsClient = require('ipfs-http-client')
global.Promise = require('bluebird')

const eos = Eos({httpEndpoint: config.httpEndpoint, chainId: config.chainId})
   

async function get_node_urls(payload, dappcontract, file) {
  const nodes = payload.data
  const owners = nodes.map(value => value.node)
  const res = await eos.getTableRows({json:true, scope: config.contract, code: config.contract,  table: 'nodes', limit:100})
  return res.rows.filter(x => owners.includes(x.owner))
}

async function all_nodes() {
  const res = await eos.getTableRows({json:true, scope: config.contract, code: config.contract,  table: 'nodes', limit:100})
  return res.rows.filter(x => x.is_active)
}

async function fetch_from_ipfs(hash) {
  const ipfs = ipfsClient(config.ipfsConfig.host, config.ipfsConfig.port, {'protocol': config.ipfsConfig.protocol})
  console.log("Ohai fetch_from_ipfs")
  const result = await ipfs.get(`/ipfs/${hash}`).timeout(1000, "Retrieving from ipfs should not block if data is pinned locally")
  console.log("ipfs result: ", result[0])
  return result[0].content.toString('utf8')
}

module.exports = {
  get_node_urls,
  all_nodes,
  fetch_from_ipfs,
}