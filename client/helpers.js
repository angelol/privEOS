import ByteBuffer from 'ByteBuffer'
import Eos from 'eosjs'

export class EosWrapper {
  constructor(config) {
    this.config = config
    this.eos = Eos({httpEndpoint:this.config.httpEndpoint, chainId: this.config.chainId, keyProvider: [this.config.key]})
  }

  get_active_nodes() {

    return this.eos.getTableRows({json:true, scope: this.config.contract, code: this.config.contract,  table: 'nodes', limit:100})
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

export function hex_to_uint8array(hex_string) {
  return new Uint8Array(ByteBuffer.fromHex(hex_string).toArrayBuffer())
}