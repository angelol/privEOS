const assert = require('assert')
const eoslime = require('eoslime').init('local')
const eosjs_ecc = require('eosjs-ecc-priveos')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const expect = chai.expect
const _ = require('underscore')
const uuidv4 = require('uuid/v4')
const Priveos = require('priveos')


const { Api, JsonRpc, RpcError } = require('eosjs')
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig')
const { TextEncoder, TextDecoder } = require('util')
const fetch = require('node-fetch')
const rpc = new JsonRpc('http://localhost:8888', { fetch })
function get_eos2(user) {
  const keyProvider = [user.privateKey]
  const signatureProvider = new JsSignatureProvider(keyProvider)
  const eos2 = new Api({ 
    rpc: new JsonRpc('http://localhost:8888', { fetch }),
    signatureProvider, 
    textDecoder: new TextDecoder(), 
    textEncoder: new TextEncoder() 
  })
  return eos2
}


const WASM = 'priveos.wasm'
const ABI = 'priveos.abi'
const contractAccount = eoslime.Account.load('priveosrules', '5KXtuBpLc6Y9Q8Q8s8CQm2G7L98bV8PK1ZKnSKvNeoiuhZw6uDH')

describe('Test', function () {
  // Increase mocha(testing framework) time, otherwise tests fails
  this.timeout(60000)
    
  let alice, bob, contract, nodes, dappcontract
  before(async () => {
    console.log("Before called")
    const cpuAmount = "1.0000 EOS"
    const netAmount = "1.0000 EOS"
    const ramBytes = 1024*1024
    let accounts = await eoslime.Account.createRandoms(3);
    alice = accounts[0]
    bob = accounts[1]
    dappcontract = accounts[2]
    for(const x of accounts) {
      await eoslime.Account.provider.defaultAccount.send(x, "10.0000")
      await x.buyBandwidth(cpuAmount, netAmount, eoslime.Account.provider.defaultAccount)
    }
    
    
    contract = await eoslime.CleanDeployer.deploy(WASM, ABI, cpuAmount, netAmount, ramBytes)
    
    nodes = await eoslime.Account.createRandoms(50)
    let port = 8001
    for(const node of nodes) {
      await node.buyBandwidth(cpuAmount, netAmount, eoslime.Account.provider.defaultAccount)
      await node.buyRam(1024, eoslime.Account.provider.defaultAccount)
      const private_key = await eosjs_ecc.randomKey()
      const public_key = eosjs_ecc.privateToPublic(private_key)
      node.key = {private_key, public_key}
      node.url = `http://localhost:${port++}`
    }
  });
  
  beforeEach(async () => {
    console.log("beforeEach called")
  })
  
  it('Regnode', async () => {
    for(const node of nodes) {
      await contract.regnode(node.name, node.key.public_key, node.url, {from: node})
    }
    const res = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'nodes', limit:100})
    
    let actual_rows = res.rows
    actual_rows = _.sortBy(actual_rows, x => x.owner)
    let expected_rows = []
    for(const node of nodes) {
      expected_rows.push({
        owner: node.name,
        node_key: node.key.public_key,
        url: node.url,
        is_active: 0,
        files: 0,
      })
    }
    expected_rows = _.sortBy(expected_rows, x => x.owner)
    console.log("actual_rows: ", actual_rows)
    console.log("expected_rows: ", expected_rows)
    expect(actual_rows).to.deep.equal(expected_rows)
    // assert.deepEqual(actual_rows, expected_rows)
  })
  
  it('Currency', async () => {
    await contract.addcurrency("4,EOS", "eosio.token")
    const res = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'currencies', limit:100})
    expect(res.rows).to.deep.equal([{
      "currency": "4,EOS",
      "contract": "eosio.token"
    }])
  })
  
  it('Set price', async () => {
    for(const node of nodes) {
      node.store_price = "0.0200 EOS"
      node.accessgrant_price = "0.0100 EOS"
      await contract.setprice(node.name, node.store_price, "store", {from: node})
      await contract.setprice(node.name, node.accessgrant_price, "accessgrant", {from: node})
    }
    let res = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'readprice', limit:100})

    expect(res.rows).to.deep.equal([{
      "money": "0.0100 EOS"
    }])
    
    res = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'storeprice', limit:100})

    expect(res.rows).to.deep.equal([{
      "money": "0.0200 EOS"
    }])
  })
  
  it('User makes a deposit', async () => {    
    await expect(
      alice.send(contract.executor, "1.0000")
    ).to.be.rejectedWith(`Balance table entry does not exist for user ${alice.name}`)
    
    await contract.prepare(alice.name, "4,EOS", {from: alice})
    await alice.send(contract.executor, "1.0000")
    
    const res = await contract.provider.eos.getTableRows({json:true, scope: alice.name, code: contract.name, table: 'balances', limit:100})
    expect(res.rows).to.deep.equal([{
      "funds": "1.0000 EOS"
    }])
  })
  
  it('voting required', async () => {
    const key = Priveos.encryption.generateKey()
    const identifier = uuidv4()
    await expect(
      contract.store(alice.name, dappcontract.name, identifier, key, 0, "4,EOS", 0, {from: alice})
    ).to.be.rejectedWith(`Contract ${dappcontract.name} has not voted yet`)
  })
  
  it('voting', async () => {
    const voted_nodes = _.shuffle(nodes.map(x => x.name)).slice(0, 30)
    console.log("Voted_notes: ", voted_nodes)
    const actions = [
        {
            account: contract.name,
            name: "vote",
            authorization: [dappcontract.permissions.active],
            data: {dappcontract: dappcontract.name, nodes: voted_nodes},
        }
    ]
    const eos2 = get_eos2(dappcontract)
    
    await eos2.transact({actions}, {
      blocksBehind: 3,
      expireSeconds: 30,
    })

    const res = await rpc.get_table_rows({json:true, scope: contract.name, code: contract.name, table: 'voters', limit:100})
    
    
    const sorted_nodes = _.sortBy(voted_nodes)
    const expected_value = [{ dappcontract: dappcontract.name, nodes: sorted_nodes}]
    console.log("votes table: ", JSON.stringify(res.rows, null, 2))
    console.log("expected_value: ", JSON.stringify(expected_value))
    expect(res.rows).to.deep.equal(expected_value)
  })
  
  it('User stores key (user pays)', async () => {    
    // const name owner, const name contract, const std::string file, const std::string data, const bool auditable, const symbol token, const bool contractpays
    const key = Priveos.encryption.generateKey()
    const identifier = uuidv4()
    const tx_result = await contract.store(alice.name, dappcontract.name, identifier, key, 0, "4,EOS", 0, {from: alice})
    console.log("tx_result.processed.receipt.cpu_usage_us: " , tx_result.processed.receipt.cpu_usage_us)
    console.log("tx_result: ", JSON.stringify(tx_result, null, 2))

    const res = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'nodes', limit:100})
    console.log("After first store: ", res.rows)
    
  })
  
  it('User stores key (contract pays)', async () => {    
    // const name owner, const name contract, const std::string file, const std::string data, const bool auditable, const symbol token, const bool contractpays
    const key = Priveos.encryption.generateKey()
    const identifier = uuidv4()
    await expect(
      contract.store(alice.name, dappcontract.name, identifier, key, 0, "4,EOS", 1, {from: alice})
    ).to.be.rejectedWith(`User ${dappcontract.name} has no balance`)
    
    await contract.prepare(dappcontract.name, "4,EOS", {from: dappcontract})
    await dappcontract.send(contract.executor, "1.0000")
    
    await contract.store(alice.name, dappcontract.name, identifier, key, 0, "4,EOS", 1, {from: alice})
    
    const res = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'nodes', limit:100})

    console.log("After second store: ", res.rows)

  })
  
  it('Accessgrant', async () => {
    
  })


})