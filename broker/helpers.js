import { get_store_trace } from '../common/mongo'
import Eos from 'eosjs'
import config from '../common/config'

const eos = Eos({httpEndpoint: config.httpEndpoint, chainId: config.chainId})
   

export function get_node_urls(dappcontract, file) {
  return get_store_trace(dappcontract, file)
  .then((data) => {
    const nodes = data.data
    const owners = nodes.map(value => value.node)
    return eos.getTableRows({json:true, scope: config.contract, code: config.contract,  table: 'nodes', limit:100})
    .then((res) => {
      return res.rows.filter((x) => {
        return owners.includes(x.owner)
      })
    })
  })
}