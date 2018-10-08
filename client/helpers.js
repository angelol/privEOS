import Eos from 'eosjs'
import fs from 'fs'

const httpEndpoint = 'http://localhost:8888'
const chainId = 'cf057bbfb72640471fd910bcb67639c22df9f92470936cddc1ade0e2f2e7dc4f'


export const key = fs.readFileSync('key.txt', {encoding: 'utf8'})
const keyProvider = [key]
export const eos = Eos({httpEndpoint, chainId, keyProvider})
export const contract = 'priveosrules'


export function get_active_nodes() {
  return eos.getTableRows({json:true, scope: contract, code: contract,  table: 'nodes', limit:100})
  .then((res) => {
    return res.rows.filter((x) => {
      return x.is_active
    })
  })
}

export function get_threshold(N) {
  return Math.floor(N/2) + 1
}