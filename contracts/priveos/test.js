const assert = require('assert')
const eoslime = require('eoslime').init('local')

const WASM = 'priveos.wasm'
const ABI = 'priveos.abi'
const contractAccount = eoslime.Account.load('priveosrules', '5KXtuBpLc6Y9Q8Q8s8CQm2G7L98bV8PK1ZKnSKvNeoiuhZw6uDH')

describe('Test', function () {
  // Increase mocha(testing framework) time, otherwise tests fails
  this.timeout(15000);
    
  let alice, bob, contract, nodes
  before(async () => {
    console.log("Before called")
        let accounts = await eoslime.Account.createRandoms(2);
        alice = accounts[0]
        bob = accounts[1]
        
        const cpuAmount = "1.0000 EOS"
        const netAmount = "1.0000 EOS"
        const ramBytes = 1024*1024
        contract = await eoslime.CleanDeployer.deploy(WASM, ABI, cpuAmount, netAmount, ramBytes)
        
        nodes = await eoslime.Account.createRandoms(5)
        for(const node of nodes) {
          await node.buyBandwidth(cpuAmount, netAmount, eoslime.Account.provider.defaultAccount)
          await node.buyRam(1024, eoslime.Account.provider.defaultAccount)
        }
  });
  
  beforeEach(async () => {
    console.log("beforeEach called")
  })
  
  it('Test 1', async () => {
    for(const node of nodes) {
      await contract.regnode(node.name, "EOS8eUWoy1J1FeEe6LVrjASatU1zL68iX3fzs62A8fcZojB16RBmd", "http://localhost:8001", {from: node})
    }
    const res = await contract.provider.eos.getTableRows({json:true, scope: contract.name, code: contract.name, table: 'nodes', limit:100})
    console.log("Res: ", res)
  })
  
  it('Test 2', async () => {
    console.log("Bob: ", bob.name)
  })

})