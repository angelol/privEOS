import { get_original_nodes } from '../common/mongo'
import Eos from 'eosjs'

export const contract = 'priveosrules'
const httpEndpoint = 'http://localhost:8888'
const chainId = 'cf057bbfb72640471fd910bcb67639c22df9f92470936cddc1ade0e2f2e7dc4f'

const eos = Eos({httpEndpoint, chainId})
   

export function get_node_urls(file) {
  return get_original_nodes(contract, file)
  .then((data) => {
    const nodes = data.data
    const owners = nodes.map(value => value.node)
    return eos.getTableRows({json:true, scope: contract, code: contract,  table: 'nodes', limit:100})
    .then((res) => {
      return res.rows.filter((x) => {
        return owners.includes(x.owner)
      })
    })
  })
}