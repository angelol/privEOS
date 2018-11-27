import Eos from 'eosjs'
import config from '../common/config'

const eos = Eos({httpEndpoint: config.httpEndpoint, chainId: config.chainId})
   

export function get_node_urls(payload, dappcontract, file) {
  const nodes = payload.data
  const owners = nodes.map(value => value.node)
  return eos.getTableRows({json:true, scope: config.contract, code: config.contract,  table: 'nodes', limit:100})
  .then(res => {
    return res.rows.filter(x => owners.includes(x.owner))
  })
}