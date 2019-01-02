const Eos = require('eosjs')
const config = require('../common/config')
const ipfsClient = require('ipfs-http-client')

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
  const ipfs = ipfsClient('localhost', '5001', { protocol: 'http' })
  const result = await ipfs.get(`/ipfs/${hash}`)
  console.log("ipfs result: ", result[0])
  return result[0].content.toString('utf8')
}

module.exports = {
  get_node_urls,
  all_nodes,
  fetch_from_ipfs,
}