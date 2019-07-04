
module.exports = {}

module.exports.fee_balance = async function(contract) {
  const bal_res = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'feebal', limit:100})
  return bal_res.rows[0].funds
}

module.exports.global_stats = async function(contract) {
  const xxx = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'global', limit:100})
  return xxx.rows[0]
}