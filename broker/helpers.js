import Eos from 'eosjs'
import config from '../common/config'

const eos = Eos({httpEndpoint: config.httpEndpoint, chainId: config.chainId})
   

export async function get_node_urls(payload, dappcontract, file) {
  const nodes = payload.data
  const owners = nodes.map(value => value.node)
  const res = await eos.getTableRows({json:true, scope: config.contract, code: config.contract,  table: 'nodes', limit:100})
  return res.rows.filter(x => owners.includes(x.owner))
}

export async function all_nodes() {
  const res = await eos.getTableRows({json:true, scope: config.contract, code: config.contract,  table: 'nodes', limit:100})
  return res.rows.filter(x => x.is_active)
}
