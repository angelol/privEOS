'use strict'
const axios = require('axios')
axios.defaults.timeout = 3000
const Promise = require('bluebird')
const log = require('../common/log')
const { URL } = require('url')
const config = require('../common/config')
const Eos = require('eosjs')
const restify = require('restify')
const eosjs_ecc = require('eosjs-ecc')


// check only required for bps to migrate to new config file with multiple chain ids
if(!config.chains) {
  log.warn(`Configuration warning: Please migrate config to support multiple chains - single chain support will be dropped in the future.`)
  config.chains = [
    config
  ]
}

function validateConfig(chainConfig, index) {
  if(!chainConfig.watchdogPermission) {
    log.error(`Configuration error in chain #${index}: Please add "watchdogPermission" to common/config.js`)
    process.exit(1)
  }
}

config.chains.forEach((chainConfig, index) => {
  validateConfig(chainConfig, index)
})


const chainConnectors = config.chains.map(chainConfig => Eos({
  httpEndpoint: chainConfig.httpEndpoint, 
  chainId: chainConfig.chainId,
  keyProvider: [chainConfig.watchdogPermission.key],
}))


if(process.argv[2]) {
  config.nodeAccount = process.argv[2]
  log.debug(`config.nodeAccount: ${config.nodeAccount}`)
}
if(process.argv[3]) {
  config.watchdogPort = process.argv[3]
}

const server = restify.createServer()

let status = 'ok'

server.get('/watchdog/status/', async function(req, res, next) {
	try { 
    const err = await check_permissions()
    if(err) {
      res.send({
  	    status: err,
  		})
    } else {
      res.send({
  	    status: status,
  		})
    }
		
	} catch(err) {
		log.error("Error: ", err)
		res.send(500, "Generic Error")
	}
	next()
})

const port = config.watchdogPort || 3101
server.listen(port, "127.0.0.1", function() {
  log.info('Watchdog listening on port ', port)
	if(process.send) {
		process.send('ready')		
	}
})

let approvals, disapprovals

async function main() {
  let checkedNodes = [] // to avoid multiple check calls to the same node due to different chain ids, we store them here

  for (let i = 0; i < chainConnectors.length; i++) {
    let eos = chainConnectors[i]
    const watchdog_should_run = await should_watchdog_run(eos)
    if(!watchdog_should_run) {
      log.info("Contract version is incompatible, skipping this round.")
      setTimeout(main, 10000)
      return
    }
    
    // 1. get nodes
    const nodes = await get_nodes(eos)
    log.debug('nodes', nodes)
    approvals = await get_approvals(eos)
    disapprovals = await get_disapprovals(eos)
    log.debug(`disapprovals: ${JSON.stringify(disapprovals)}`)
    // 2. check node status
    //    if okay and not active => approve
    //    if not okay and active => disapprove
    //    with 30 nodes, 1 round takes 60 seconds
    for(const node of nodes) {
      try {
        await handle_node(node, eos)
        status = 'ok'
      } catch(e) {
        log.error(e)
        if(status == 'ok') {
          status = 'error while checking node'
        } 
      }
      await Promise.delay(2000)
    }
  }
  setTimeout(main, 0)
}

async function handle_node(node, eos) {
  const node_is_okay = await is_node_okay(node)
  log.debug(`Node ${node.owner} is ${node_is_okay}`)
  if(node_is_okay && !node.is_active) {
    log.info(`Node ${node.owner} is okay, approving`)
    return approve(node, eos)
  }
  if(!node_is_okay && node.is_active) {
    log.info(`Node ${node.owner} is down, disapproving`)
    return disapprove(node, eos)
  }
}

async function approve(node, eos) {
  if(needs_my_approval(node)) {
    log.debug(`Node ${node.owner} needs my approval`)
    return execute_transaction(node, 'peerappr', eos)
  } else {
    log.debug(`Node ${node.owner} already approved by me`)
  }
}

async function disapprove(node, eos) {
  if(needs_my_disapproval(node)) {
    log.debug(`Node ${node.owner} needs my disapproval`)
    return execute_transaction(node, 'peerdisappr', eos)
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
    return true
  }
  // Only disapprove if we haven't already disapproved this request
  return !disapproval.includes(config.nodeAccount)  
}

async function get_approvals(eos) {
  const res = await eos.getTableRows({json:true, scope: config.contract, code: config.contract,  table: 'peerapproval', limit:100})
  return res.rows.reduce((a, b) => {
    if(!is_expired(b)) {
      a[b.node] = b.approved_by
    }
    return a
  }, {})
}

async function get_disapprovals(eos) {
  const res = await eos.getTableRows({json:true, scope: config.contract, code: config.contract,  table: 'peerdisappr', limit:100})
  log.debug(`get_disapprovals: ${JSON.stringify(res.rows,null, 2)}`)
  return res.rows.reduce((a, b) => {
    if(!is_expired(b)) {
      a[b.node] = b.disapproved_by
    }
    return a
  }, {})
}

function is_expired(approval) {
  return ((new Date()).getTime()/1000 - approval.created_at) > 5*60 
}
async function execute_transaction(node, action_name, eos) {
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
  try { 
    const res = eos.transaction({actions})
    status = 'ok'
    return res
  } catch(e) {
    log.error(`Error while executing transaction: ${e}`)
    status = "error while executing transaction"
    throw e
  }
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
async function get_nodes(eos) {
  const res = await eos.getTableRows({json:true, scope: config.contract, code: config.contract,  table: 'nodes', limit:100})
  return res.rows.filter(x => x.owner != config.nodeAccount)
}

async function should_watchdog_run(eos) {
  const res = await eos.getAbi({account_name: config.contract})
  const table_names = res.abi.tables.map(x => x.name)
  // console.log(JSON.stringify(table_names, null, 2))
  return table_names.includes('peerapproval')
}

async function check_permissions(eos) {
  const res = await eos.getAccount(config.nodeAccount)
  // console.log("res: ", res)
  const watchdog_perm = res.permissions.filter(x => x.perm_name == config.watchdogPermission.permission)[0]
  
  if(!watchdog_perm) {
    return `No permission found with name ${config.watchdogPermission.permission}`
  }
  // console.log("watchdog_perm.required_auth: ", JSON.stringify(watchdog_perm.required_auth, null, 2))
  const auth = watchdog_perm.required_auth
  
  if(auth.threshold != 1) {
    return "Threshold should be 1"
  }
  
  const configured_public_key = eosjs_ecc.privateToPublic(config.watchdogPermission.key)
  
  if(auth.keys[0].key != configured_public_key) {
    return `Key is ${auth.keys[0].key} but configured key is ${configured_public_key}`
  }  
}

main()

