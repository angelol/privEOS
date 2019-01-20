'use strict'
const axios = require('axios')
axios.defaults.timeout = 3000
const Promise = require('bluebird')
const log = require('../common/log')
const { URL } = require('url')
const config = require('../common/config')
const Eos = require('eosjs')

const eos = Eos({
  httpEndpoint: config.httpEndpoint, 
  chainId: config.chainId, 
  keyProvider: [config.watchdogPermission.key],
})

if(process.argv[2]) {
  config.nodeAccount = process.argv[2]
  log.debug(`config.nodeAccount: ${config.nodeAccount}`)
}

let approvals, disapprovals

async function main() {
  if(process.send) {
		process.send('ready')		
	}
  log.debug("Ohai main")
  
  const watchdog_should_run = await should_watchdog_run()
  if(!watchdog_should_run) {
    log.info("Contract version is incompatible, skipping this round.")
    setTimeout(main, 10000)
    return
  }
  
  // 1. get nodes
  const nodes = await get_nodes()
  approvals = await get_approvals()
  disapprovals = await get_disapprovals()
  log.debug(`disapprovals: ${JSON.stringify(disapprovals)}`)
  // 2. check node status
  //    if okay and not active => approve
  //    if not okay and active => disapprove
  //    with 30 nodes, 1 round takes 60 seconds
  for(const node of nodes) {
    await handle_node(node)
    await Promise.delay(2000)
  }
  setTimeout(main, 0)
}

async function handle_node(node) {
  const node_is_okay = await is_node_okay(node)
  log.debug(`Node ${node.owner} is ${node_is_okay}`)
  if(node_is_okay && !node.is_active) {
    log.debug(`Node ${node.owner} is okay, approving`)
    return approve(node)
  }
  if(!node_is_okay && node.is_active) {
    log.debug(`Node ${node.owner} is down, disapproving`)
    return disapprove(node)
  }
}

async function approve(node) {
  if(needs_my_approval(node)) {
    log.debug(`Node ${node.owner} needs my approval`)
    return execute_transaction(node, 'peerappr')
  } else {
    log.debug(`Node ${node.owner} already approved by me`)
  }
}

async function disapprove(node) {
  if(needs_my_disapproval(node)) {
    log.debug(`Node ${node.owner} needs my disapproval`)
    return execute_transaction(node, 'peerdisappr')
  } else {
    log.debug(`Node ${node.owner} already disapproved by me`)
  }
}

function needs_my_approval(node) {
  const approval = approvals[node.owner]
  log.debug(`needs_my_approval: approval: ${approval}`)
  if(!approval) {
    return true
  }
  // Only approve if we haven't already approved this request
  return !approval.includes(config.nodeAccount)
}

function needs_my_disapproval(node) {
  const disapproval = disapprovals[node.owner]
  log.debug(`Node ${node.owner} disapproval: ${disapproval}`)
  if(!disapproval) {
    /* This is different from the behaviour for approvals.
     * If a node is not okay, we are disapproving it regardless of
     * whether or not a disapproval request already exists.
     */
    return true
  }
  // Only disapprove if we haven't already disapproved this request
  return !disapproval.includes(config.nodeAccount)  
}

async function get_approvals() {
  const res = await eos.getTableRows({json:true, scope: config.contract, code: config.contract,  table: 'peerapproval', limit:100})
  return res.rows.reduce((a, b) => {
    a[b.node] = b.approved_by
    return a
  }, {})
}

async function get_disapprovals() {
  const res = await eos.getTableRows({json:true, scope: config.contract, code: config.contract,  table: 'peerdisappr', limit:100})
  log.debug(`get_disapprovals: ${JSON.stringify(res.rows,null, 2)}`)
  return res.rows.reduce((a, b) => {
    a[b.node] = b.disapproved_by
    return a
  }, {})
}

async function execute_transaction(node, action_name) {
  const actions = [{
    account: config.contract,
    name: action_name,
    authorization: [{
      actor: config.nodeAccount,
      permission: config.watchdogPermission.permission,
    }],
    data: {
      sender: config.nodeAccount,
      owner: node.owner,
    }
  }]
  return eos.transaction({actions})
}

async function is_node_okay(node) {
  const url = new URL('/broker/status/', node.url)
  log.debug(`Trying ${url.href}`)
  let okay = false
  try {
    const res = await axios.get(url.href)
    if(res.data.status == 'ok') {
      okay = true
    }
  } catch(e) {
    okay = false
  }
  return okay
}
async function get_nodes() {
  const res = await eos.getTableRows({json:true, scope: config.contract, code: config.contract,  table: 'nodes', limit:100})
  return res.rows.filter(x => x.owner != config.nodeAccount)
}

async function should_watchdog_run() {
  const res = await eos.getAbi({account_name: config.contract})
  const table_names = res.abi.tables.map(x => x.name)
  // console.log(JSON.stringify(table_names, null, 2))
  return table_names.includes('peerapproval')
}
main()
// get_disapprovals().then(x => console.log(JSON.stringify(x, null, 2)))

// xxx()
