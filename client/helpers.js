import Eos from 'eosjs'
import config from './config'

export const eos = Eos({httpEndpoint:config.httpEndpoint, chainId: config.chainId, keyProvider: [config.key]})

export function get_active_nodes() {
  return eos.getTableRows({json:true, scope: config.contract, code: config.contract,  table: 'nodes', limit:100})
  .then((res) => {
    return res.rows.filter((x) => {
      return x.is_active
    })
  })
}

export function get_threshold(N) {
  return Math.floor(N/2) + 1
}