const log = require('../common/log')
const config = require('../common/config')
const ipfsClient = require('ipfs-http-client')
global.Promise = require('bluebird')


async function all_nodes(chain) {
  const res = await chain.eos.getTableRows({json:true, scope: chain.config.contract, code: chain.config.contract, table: 'nodes', limit:100})
  return res.rows.filter(x => x.is_active)
}

async function get_nodes(chain, payload) {
  const nodes = payload.data
  const owners = nodes.map(value => value.node)
  const active_nodes = await all_nodes(chain)
  return active_nodes.filter(x => owners.includes(x.owner))
}

async function fetch_from_ipfs(hash) {
  const ipfs = ipfsClient(config.ipfsConfig.host, config.ipfsConfig.port, {'protocol': config.ipfsConfig.protocol})
  log.debug("Ohai fetch_from_ipfs")
  const result = await ipfs.get(`/ipfs/${hash}`).timeout(1000, `Retrieving from ipfs should not block if data is pinned locally. Hash: ${hash}`)
  log.debug("ipfs result: ", result[0])
  return result[0].content.toString('utf8')
}

function add_default_headers(req, res, next) {
	res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
	next()
}

module.exports = {
  get_nodes,
  all_nodes,
  fetch_from_ipfs,
  add_default_headers,
}