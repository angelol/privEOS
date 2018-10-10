import Eos from 'eosjs'
import config from './config'


export class EosWrapper {
  constructor(config) {
    this.eos = Eos({httpEndpoint:config.httpEndpoint, chainId: config.chainId, keyProvider: [config.key]})
  }

  get_active_nodes() {

    return this.eos.getTableRows({json:true, scope: config.contract, code: config.contract,  table: 'nodes', limit:100})
    .then((res) => {
      return res.rows.filter((x) => {
        return x.is_active
      })
    }).catch((err) => {
      console.error('Cannot retreive active nodes: ', err)
    })
  }
}


export function get_threshold(N) {
  return Math.floor(N/2) + 1
}