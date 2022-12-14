const assert = require('assert')
const eoslime = require('eoslime-priveos').init('local')
const eosjs_ecc = require('eosjs-ecc-priveos')
const util = require('util')
const exec = util.promisify(require('child_process').exec);
const Bluebird = require('bluebird')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const expect = chai.expect
const _ = require('underscore')
const uuidv4 = require('uuid/v4')
const Priveos = require('priveos')
const helpers = require('./test.helpers')
const { Api, JsonRpc, RpcError } = require('eosjs')
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig')
const { TextEncoder, TextDecoder } = require('util')
const fetch = require('node-fetch')
const rpc = new JsonRpc('http://localhost:8888', { fetch })

const accessgrant_price = "0.0100 EOS"
const store_price = "0.0200 EOS"

const WASM = 'src/priveos.wasm'
const ABI = 'src/priveos.abi'

const TOKEN_WASM = 'src/eosio.token.wasm'
const TOKEN_ABI = 'src/eosio.token.abi'

const contractAccount = eoslime.Account.load('priveosrules', '5KXtuBpLc6Y9Q8Q8s8CQm2G7L98bV8PK1ZKnSKvNeoiuhZw6uDH')

let alice, bob, contract, nodes, dappcontract, priveos_token_contract, watchdog_account, slantagwallet, voted_nodes

const epsilon = 0.001

describe('Test before DAC activation', function () {
  // Increase mocha(testing framework) time, otherwise tests fails
  this.timeout(60000)
    
  before(async () => {
    console.log("Before called")
    const cpuAmount = "1.0000 EOS"
    const netAmount = "1.0000 EOS"
    const ramBytes = 2048*1024
    let accounts = await eoslime.Account.createRandoms(5);
    alice = accounts[0]
    bob = accounts[1]
    dappcontract = accounts[2]
    slantagwallet = accounts[3]
    watchdog_account = accounts[4]
    console.log("slantagwallet is: ", slantagwallet.name)
    for(const x of accounts) {
      await eoslime.Account.provider.defaultAccount.send(x, "10.0000")
      await x.buyBandwidth(cpuAmount, netAmount, eoslime.Account.provider.defaultAccount)
    }
    
    // deploy priveos token
    priveos_token_contract = await eoslime.CleanDeployer.deploy(TOKEN_WASM, TOKEN_ABI, {}, cpuAmount, netAmount, ramBytes)
    console.log("PrivEOS Token contract deployed to: ", priveos_token_contract.executor.name)

    
    const command = `eosio-cpp -I. -O=z -DLOCAL -DTOKENCONTRACT=${priveos_token_contract.executor.name} -DWATCHDOG_ACCOUNT=${watchdog_account.name} -abigen priveos.cpp -o priveos.wasm`
    console.log("Command: ", command)
    const { stdout, stderr } = await exec(command, {cwd: './src'})
    console.log(stdout, stderr)
    
    contract = await eoslime.CleanDeployer.deploy(WASM, ABI, {inline: true}, cpuAmount, netAmount, ramBytes)
    console.log("Contract deployed to ", contract.executor.name)
    
    nodes = await eoslime.Account.createRandoms(10)
    let port = 8001
    for(const node of nodes) {
      await eoslime.Account.provider.defaultAccount.send(node, "1100.0000")
      await node.buyBandwidth(cpuAmount, netAmount, eoslime.Account.provider.defaultAccount)
      await node.buyRam(1024, eoslime.Account.provider.defaultAccount)
      const private_key = await eosjs_ecc.randomKey()
      const public_key = eosjs_ecc.privateToPublic(private_key)
      node.key = {private_key, public_key}
      node.url = `http://localhost:${port++}`
    }
    
    
  });
  
  beforeEach(async () => {
    // console.log("beforeEach called")
  })
  
  it('Issue priveos token', async() => {
    await priveos_token_contract.create(priveos_token_contract.executor.name, "1000.0000 PRIVEOS")
    await priveos_token_contract.issue(priveos_token_contract.name, "1000.0000 PRIVEOS", "Issue total supply all at once")
    
    await helpers.token_send(priveos_token_contract.executor, priveos_token_contract.executor, slantagwallet, "1000.0000 PRIVEOS")    
    const balance = await rpc.get_currency_balance(priveos_token_contract.executor.name, slantagwallet.name, "PRIVEOS")
    expect(balance[0]).to.equal("1000.0000 PRIVEOS")
    
    await helpers.token_send(priveos_token_contract.executor, slantagwallet, contract.executor, "800.0000 PRIVEOS")
    const balance2 = await rpc.get_currency_balance(priveos_token_contract.executor.name, contract.executor.name, "PRIVEOS")
    expect(balance2[0]).to.equal("800.0000 PRIVEOS")
    // const res = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'freebal', limit:100})
    const res = await rpc.get_table_rows({json:true, scope: contract.name, code: contract.name, table: 'freebal', limit:100})
    console.log("Line 101 res: ", res)
    expect(res.rows[0].funds).to.equal("800.0000 PRIVEOS")
      
    await contract.delegate(alice.name, "200.0000 PRIVEOS")
    const res2 = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'freebal', limit:100})
    expect(res2.rows[0].funds).to.equal("600.0000 PRIVEOS")
    
    const res3 = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'delegation', limit:100})
    expect(res3.rows).to.deep.include({
      user: alice.name,
      funds: "200.0000 PRIVEOS",
    })
    
    const res4 = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'freebal', limit:100})
    expect(res4.rows[0].funds).to.equal("600.0000 PRIVEOS")
  })

  it('Priveos founder tokens', async() => {
    let res
    const locked_until = Math.round((new Date()).getTime()/1000) + 5  
    await helpers.token_send(priveos_token_contract.executor, slantagwallet, contract.executor, "10.0000 PRIVEOS")

    const resf1 = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'freebal', limit:100})
    expect(resf1.rows[0].funds).to.equal("610.0000 PRIVEOS")

    await helpers.add_founder(priveos_token_contract, contract, bob, 10, locked_until)

    res = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'stakedbal', limit:100})
    expect(res.rows[0].funds).to.equal("5.0000 PRIVEOS")
    
    res = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'freebal', limit:100})
    expect(res.rows[0].funds).to.equal("600.0000 PRIVEOS")

    res = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'founderbal', limit:100})
    expect(res.rows).to.deep.include({
      founder: bob.name,
      funds: "5.0000 PRIVEOS",
      locked_until,
    })

    const balance = await rpc.get_currency_balance(priveos_token_contract.executor.name, bob.name, "PRIVEOS")
    expect(balance[0]).to.be.undefined

    await expect(
      contract.founderunsta(bob.name, "1.0000 PRIVEOS", {from: bob})
    ).to.be.rejectedWith("Funds have not yet become unlocked")
        
    res = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'freebal', limit:100})
    expect(res.rows[0].funds).to.equal("600.0000 PRIVEOS")

    // wait for tokens to become unlocked
    await Bluebird.delay(6000)

    await contract.founderunsta(bob.name, "1.0000 PRIVEOS", {from: bob, unique: true})

    res = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'freebal', limit:100})
    expect(res.rows[0].funds).to.equal("600.0000 PRIVEOS")
    
    const balance2 = await rpc.get_currency_balance(priveos_token_contract.executor.name, bob.name, "PRIVEOS")
    expect(balance2[0]).to.equal("1.0000 PRIVEOS")
    
    await contract.founderunsta(bob.name, "2.0000 PRIVEOS", {from: bob})
    
    const balance3 = await rpc.get_currency_balance(priveos_token_contract.executor.name, bob.name, "PRIVEOS")
    expect(balance3[0]).to.equal("3.0000 PRIVEOS")
    
    await expect(
      contract.founderunsta(bob.name, "3.0000 PRIVEOS", {from: bob})
    ).to.be.rejectedWith('Overdrawn balance. User has only 2.0000 PRIVEOS but is trying to withdraw 3.0000 PRIVEOS')
    
    await contract.founderunsta(bob.name, "1.5000 PRIVEOS", {from: bob})
    await contract.founderunsta(bob.name, "0.5000 PRIVEOS", {from: bob})

    const balance4 = await rpc.get_currency_balance(priveos_token_contract.executor.name, bob.name, "PRIVEOS")
    expect(balance4[0]).to.equal("5.0000 PRIVEOS")
    
    res = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'founderbal', limit:100})
    expect(res.rows).to.be.empty
    await helpers.token_send(priveos_token_contract.executor, bob, contract.executor, "5.0000 PRIVEOS")
    await contract.stake(bob.name, `5.0000 PRIVEOS`, {from: bob})
    
    res = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'freebal', limit:100})
    expect(res.rows[0].funds).to.equal("600.0000 PRIVEOS")
    
  })
  
  it('Create node token', async() => {
    await priveos_token_contract.create(contract.executor.name, "461168601842738.0000 NODET")
  })
  
  
  it('Contract init', async() => {
    expect(await helpers.global_stats(contract)).to.be.undefined
    await contract.init()
    expect(await helpers.global_stats(contract)).to.deep.equal({
      "unique_files": 0,
      "files": "0.00000000000000000",
      "dac_activated": 0,
      "registered_nodes": 0,
      "active_nodes": 0
    });
    
    let res = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'freebal', limit:100})
    expect(res.rows[0].funds).to.equal("0.0000 PRIVEOS")
    
    res = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'nodedelegat', limit:100})
    expect(res.rows[0].funds).to.equal("600.0000 PRIVEOS")
    
  })
  
  it('Currency', async () => {
    await contract.addcurrency("4,EOS", "eosio.token")
    const res = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'currencies', limit:100})
    expect(res.rows).to.deep.equal([{
      "currency": "4,EOS",
      "contract": "eosio.token"
    }])
  })
  
  it('Regnode', async () => {
    for(const node of nodes) {
      await contract.prepare(node.name, "4,EOS", {from: node})
      await node.send(contract.executor, "10.0000")
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
        files: "0.00000000000000000",
        bond: "0.0000 EOS",
        cleared_for_leaving: 0,
        wants_to_leave: 0,
      })
    }
    expected_rows = _.sortBy(expected_rows, x => x.owner)
    // console.log("actual_rows: ", actual_rows)
    // console.log("expected_rows: ", expected_rows)
    expect(actual_rows).to.deep.equal(expected_rows)
    // assert.deepEqual(actual_rows, expected_rows)
    
    expect(await helpers.global_stats(contract)).to.deep.equal({
      "unique_files": 0,
      "files": "0.00000000000000000",
      "dac_activated": 0,
      "registered_nodes": 10,
      "active_nodes": 0
    });
  })
  
  it('Unregnode', async () => {
    const node = nodes[0]
    await contract.unregnode(node.name, {from: node})
    
    const res = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'nodes', limit:100})
    let actual_rows = res.rows
    
    let expected_rows = []
    expected_rows.push({
      owner: node.name,
      node_key: node.key.public_key,
      url: node.url,
      is_active: 0,
      files: "0.00000000000000000",
      bond: "0.0000 EOS",
      cleared_for_leaving: 0,
      wants_to_leave: 1,
    })
    for(const node of nodes.slice(1)) {
      expected_rows.push({
        owner: node.name,
        node_key: node.key.public_key,
        url: node.url,
        is_active: 0,
        files: "0.00000000000000000",
        bond: "0.0000 EOS",
        cleared_for_leaving: 0,
        wants_to_leave: 0,
      })
    }
    expected_rows = _.sortBy(expected_rows, x => x.owner)
    expect(actual_rows).to.deep.equal(expected_rows)
    
    expect(await helpers.global_stats(contract)).to.deep.equal({
      "unique_files": 0,
      "files": "0.00000000000000000",
      "dac_activated": 0,
      "registered_nodes": 10,
      "active_nodes": 0
    })
    
    await contract.regnode(node.name, node.key.public_key, node.url, {from: node})
    
    expect(await helpers.global_stats(contract)).to.deep.equal({
      "unique_files": 0,
      "files": "0.00000000000000000",
      "registered_nodes": 10,
      "dac_activated": 0,
      "active_nodes": 0
    })
  })
  
  it("Set price", async () => {      
    for(const node of nodes) {
      node.store_price = "0.0210 EOS"
      node.accessgrant_price = "0.0110 EOS"
      await contract.setprice(node.name, node.store_price, "store", {from: node})
      await contract.setprice(node.name, node.accessgrant_price, "accessgrant", {from: node})
    }
    let res = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'readprice', limit:100})
    expect(res.rows).to.deep.equal([])
    
    await contract.admsetprice(accessgrant_price, "accessgrant")
    await contract.admsetprice(store_price, "store")
    let res2 = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'readprice', limit:100})
    expect(res2.rows).to.deep.equal([{
      "money": "0.0100 EOS"
    }])
    

    res = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'storeprice', limit:100})

    expect(res.rows).to.deep.equal([{
      "money": "0.0200 EOS"
    }])

  })
  
    it('Postbond', async () => {
      const node = nodes[0]
      await contract.prepare(node.name, "4,EOS", {from: node})
      await node.send(contract.executor, "1.1234")
      await expect(     
        contract.postbond(node.name, "1.1235 EOS", {from: node})
      ).to.rejectedWith(`Overdrawn balance`)
      
      await contract.postbond(node.name, "1.1234 EOS", {from: node})
      await expect(     
        contract.postbond(node.name, "1.1233 EOS", {from: node})
      ).to.rejectedWith(`User ${node.name} has no balance`)

      const res = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'nodes', limit:100})      
      const nodeinfo = res.rows.find(x => x.owner == node.name)
      expect(nodeinfo.bond).to.equal("1.1234 EOS")
    })
  
  it('Activate nodes', async() => {
    for(const node of nodes) {
      await contract.admactivate(node.name, {from: watchdog_account})
    }
    
    expect(await helpers.global_stats(contract)).to.deep.equal({
      "unique_files": 0,
      "files": "0.00000000000000000",
      "dac_activated": 0,
      "registered_nodes": 10,
      "active_nodes": 10
    });
  })
  
  it('Disable nodes', async() => {
    const node = nodes[0]
    await contract.admdisable(node.name, {from: watchdog_account})
    
    expect(await helpers.global_stats(contract)).to.deep.equal({
      "unique_files": 0,
      "files": "0.00000000000000000",
      "dac_activated": 0,
      "registered_nodes": 10,
      "active_nodes": 9
    });
    
    await contract.admactivate(node.name, {from: watchdog_account})
    await expect(
      contract.admactivate(node.name)
    ).to.be.rejectedWith(`missing authority of ${watchdog_account.name}`)
    
    expect(await helpers.global_stats(contract)).to.deep.equal({
      "unique_files": 0,
      "files": "0.00000000000000000",
      "dac_activated": 0,
      "registered_nodes": 10,
      "active_nodes": 10
    });

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
    voted_nodes = _.shuffle(nodes).slice(0, 5)
    // console.log("Voted_notes: ", voted_nodes)
    const voted_node_names = voted_nodes.map(x => x.name)
    const actions = [
        {
            account: contract.name,
            name: "vote",
            authorization: [dappcontract.executiveAuthority],
            data: {dappcontract: dappcontract.name, votees: voted_node_names},
        }
    ]
    /* We have to use eosjs2 for this as the old one doesn't support 
     * sending std::vector<name> as parameter */
    const eos2 = helpers.get_eos2(dappcontract)
    
    await eos2.transact({actions}, {
      blocksBehind: 3,
      expireSeconds: 30,
    })

    const res = await rpc.get_table_rows({json:true, scope: contract.name, code: contract.name, table: 'voters', limit:100})
    
    
    const sorted_nodes = _.sortBy(voted_node_names)
    // console.log("votes table: ", JSON.stringify(res.rows, null, 2))
    // console.log("expected_value: ", JSON.stringify(expected_value))
    
    expect(res.rows[0].dappcontract).to.equal(dappcontract.name)
    expect(res.rows[0].nodes).to.deep.equal(sorted_nodes)
    expect(res.rows[0].offset).to.be.within(0, sorted_nodes.length - 1)
    
    // expect(res.rows).to.deep.equal(expected_value)
  })
  
  it('voting for unregistered node should throw', async () => {
    const voted_nodes = _.shuffle(nodes.map(x => x.name)).slice(0, 5)
    
    voted_nodes.push(alice.name)
    
    const actions = [
        {
            account: contract.name,
            name: "vote",
            authorization: [dappcontract.executiveAuthority],
            data: {dappcontract: dappcontract.name, votees: voted_nodes},
        }
    ]
    
    const eos2 = helpers.get_eos2(dappcontract)
    
    expect(
      eos2.transact({actions}, {
        blocksBehind: 3,
        expireSeconds: 30,
      })
    ).to.be.rejectedWith(`You're trying to vote for ${alice.name} which is not a registered node`)
    
  })
  
  it('User stores key (user pays)', async () => {    
    // const name owner, const name contract, const std::string file, const std::string data, const bool auditable, const symbol token, const bool contractpays
    let node_token_balance = await rpc.get_currency_balance(priveos_token_contract.executor.name, contract.executor.name, "NODET")
    expect(node_token_balance[0]).to.be.undefined
    
    const data = "some_ipfs_hash"
    const identifier = uuidv4()
    const tx_result = await contract.store(alice.name, dappcontract.name, identifier, data, 0, "4,EOS", 0, {from: alice})
    // console.log("tx_result.processed.receipt.cpu_usage_us: " , tx_result.processed.receipt.cpu_usage_us)
    // console.log("tx_result: ", JSON.stringify(tx_result, null, 2))

    const res = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'nodes', limit:100})
    // console.log("After first store: ", res.rows)
    
    expect(await helpers.fee_balance(contract)).to.equal("100.0200 EOS")
    
    node_token_balance = await rpc.get_currency_balance(priveos_token_contract.executor.name, contract.executor.name, "NODET")
    expect(helpers.asset_equal_epsilon(node_token_balance[0], "5.0000 NODET")).to.be.true
    
  })
  
  it('User stores key (contract pays)', async () => {    
    // const name owner, const name contract, const std::string file, const std::string data, const bool auditable, const symbol token, const bool contractpays
    const data = "some_ipfs_hash"
    const identifier = "identifier"
    await expect(
      contract.store(alice.name, dappcontract.name, identifier, data, 0, "4,EOS", 1, {from: alice})
    ).to.be.rejectedWith(`User ${dappcontract.name} has no balance`)
    
    await contract.prepare(dappcontract.name, "4,EOS", {from: dappcontract})
    await dappcontract.send(contract.executor, "1.0000")
    
    await contract.store(alice.name, dappcontract.name, identifier, data, 0, "4,EOS", 1, {from: alice})
    
    const res = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'nodes', limit:100})

    // console.log("After second store: ", res.rows)
    
    expect(await helpers.fee_balance(contract)).to.equal("100.0400 EOS")
    
    const node_token_balance = await rpc.get_currency_balance(priveos_token_contract.executor.name, contract.executor.name, "NODET")
    
    expect(helpers.asset_equal_epsilon(node_token_balance[0], "10.0000 NODET")).to.be.true

  })
  
  it('Accessgrant', async () => {
    const identifier = "identifier"
    const private_key = await eosjs_ecc.randomKey()
    const public_key = eosjs_ecc.privateToPublic(private_key)
    await contract.accessgrant(bob.name, dappcontract.name, identifier, public_key, "4,EOS", 1, {from: bob})
    
    // console.log("bal_res.rows: ", JSON.stringify(bal_res.rows, null, 2))
    expect(await helpers.fee_balance(contract)).to.equal("100.0500 EOS")
    
    const gstats = await helpers.global_stats(contract)
    expect(gstats).to.include({
      "unique_files": 2,
      // "files": "10.00000000000000000",
      "dac_activated": 0,
      "registered_nodes": 10,
      "active_nodes": 10
    })
    expect(parseFloat(gstats.files)).to.be.closeTo(10, epsilon)
  })
  
  
  
  
  
  

})


describe('Token holder rewards', function () {
  this.timeout(60000)
  
  it('Withdraw token holder reward', async () => {
    // generate some fees
    for(let i = 0; i < 20; i++) {
      await contract.store(alice.name, dappcontract.name, "identifier" + i, "data", 0, "4,EOS", 1, {from: alice})
    }
    
    await contract.dacrewards(bob.name, "4,EOS", {from: bob})
  
    await expect(
      contract.dacrewards(bob.name, "4,EOS", {from: bob, unique: true})
    ).to.be.rejectedWith('There is nothing to withdraw, please try again later')
  
    const private_key = await eosjs_ecc.randomKey()
    const public_key = eosjs_ecc.privateToPublic(private_key)
    await contract.accessgrant(alice.name, dappcontract.name, "xxx", public_key, "4,EOS", 1, {from: alice})
    
    await contract.dacrewards(bob.name, "4,EOS", {from: bob, unique: true})
  
  
  })
  
  it('Withdraw node reward', async () => {
    
    for(const node of voted_nodes) {
      await contract.noderewards(node.name, "4,EOS", {from: node})
    }
  })
  
  // it('XXX', async () => {
  //   await contract.test(nodes[0].name)
  // })
})

// describe('After DAC activation'), function () {
//   it('Approve nodes', async () => {
//     let res = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'nodes', limit:100})
// 
//     const all_inactive = _.every(res.rows, x => !x.is_active)    
//     expect(all_inactive).to.be.true;
// 
//     for(const a of nodes) {
//       for(const b of nodes) {
//         await contract.peerappr(a.name, b.name, {from: a})
//       }
//     }
// 
//     res = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'nodes', limit:100})
// 
//     const all_active = _.every(res.rows, x => x.is_active)    
//     expect(all_active).to.be.true;
// 
//     expect(await helpers.global_stats(contract)).to.deep.equal({
//       "unique_files": 0,
//       "files": "0.00000000000000000",
//       "dac_activated": 0,
//       "registered_nodes": 10,
//       "active_nodes": 10
//     });
//   })
// 
//   it('Disapprove nodes', async () => {
// 
//     /* All nodes disapprove the first node */
//     for(const a of nodes) {
//       const b = nodes[0]
//       await contract.peerdisappr(a.name, b.name, {from: a})
//     }
// 
//     expect(await helpers.global_stats(contract)).to.deep.equal({
//       "unique_files": 0,
//       "files": "0.00000000000000000",
//       "registered_nodes": 10,
//       "dac_activated": 0,
//       "active_nodes": 9,
//     });
// 
//     /* And we're reapproving it */
//     for(const a of nodes) {
//       const b = nodes[0]
//       await contract.peerappr(a.name, b.name, {from: a})
//     }
// 
//     expect(await helpers.global_stats(contract)).to.deep.equal({
//       "unique_files": 0,
//       "files": "0.00000000000000000",
//       "registered_nodes": 10,
//       "dac_activated": 0,
//       "active_nodes": 10,
//     });
//   })
// 
// }
