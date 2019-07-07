const { Api, JsonRpc, RpcError } = require('eosjs')
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig')
const { TextEncoder, TextDecoder } = require('util')
const fetch = require('node-fetch')
const rpc = new JsonRpc('http://localhost:8888', { fetch })

module.exports = {}

module.exports.get_eos2 = function(user) {
  const keyProvider = [user.privateKey]
  const signatureProvider = new JsSignatureProvider(keyProvider)
  const eos2 = new Api({ 
    rpc,
    signatureProvider, 
    textDecoder: new TextDecoder(), 
    textEncoder: new TextEncoder() 
  })
  return eos2
}

module.exports.fee_balance = async function(contract) {
  const bal_res = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'feebal', limit:100})
  return bal_res.rows[0].funds
}

module.exports.global_stats = async function(contract) {
  const xxx = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'global', limit:100})
  return xxx.rows[0]
}

module.exports.token_send = async function(token_contract, from, to, amount, memo='') {
  const actions = [{
    account: token_contract.name,
    name: 'transfer',
    authorization: [{
      actor: from.name,
      permission: 'active',
    }], 
    data: {
      from: from.name,
      to: to.name, 
      quantity: amount,
      memo,
    },
  },]
  
  const eos2 = module.exports.get_eos2(from)
  await eos2.transact({actions}, {
    blocksBehind: 3,
    expireSeconds: 30,
  })
}

module.exports.add_founder = async function(token_contract, contract, account, amount, locked_until) {
  const stake_amount = amount/2;
  const hold_amount = amount/2;
  await contract.stake(account.name, `${stake_amount.toFixed(4)} PRIVEOS`, locked_until)
  await module.exports.token_send(token_contract, contract.executor, account, `${hold_amount.toFixed(4)} PRIVEOS`);
  
}
