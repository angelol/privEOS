'use strict'
const axios = require('axios')
axios.defaults.timeout = 3000
const Promise = require('bluebird')
const log = require('../common/log')
const { URL } = require('url')
const config = require('../common/config')
const chains = require('../common/chains')
const restify = require('restify')
const eosjs_ecc = require('eosjs-ecc')


if(process.argv[2]) {
  config.watchdogPort = process.argv[2]
}

const server = restify.createServer()

let status = 'ok'

server.get('/watchdog/status/', async function(req, res, next) {
  try {
    let errors = []
    for (let i = 0; i < chains.adapters.length; i++) {
      let chain = chains.adapters[i]
      const err = await check_permissions(chain)
      if (err) errors.push(err)
    }
    if(errors.length > 0) {
      res.send({
        status: errors,
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
let localApprovals, localDisapprovals

async function main() {
  localApprovals = []
  localDisapprovals = []

  for (let i = 0; i < chains.adapters.length; i++) {
    let chain = chains.adapters[i]
    log.debug(`Run watchdog for ${chain.config.httpEndpoint}, ${chain.config.chainId}`)
    const watchdog_should_run = await should_watchdog_run(chain)
    if(!watchdog_should_run) {
      log.info("Contract version is incompatible, skipping this round.")
      setTimeout(main, 10000)
      return
    }
    
    // 1. get nodes
    const nodes = await get_nodes(chain)
    log.debug('nodes', nodes)
    approvals = await get_approvals(chain)
    log.debug(`approvals: ${JSON.stringify(approvals)}`)
    disapprovals = await get_disapprovals(chain)
    log.debug(`disapprovals: ${JSON.stringify(disapprovals)}`)
    // 2. check node status
    //    if okay and not active => approve
    //    if not okay and active => disapprove
    //    with 30 nodes, 1 round takes 60 seconds
    for(const node of nodes) {
      try {
        await handle_node(node, chain)
        status = 'ok'
      } catch(e) {
        log.error(e)
        if(status == 'ok') {
          status = 'error while checking node'
        } 
      }
      await Promise.delay(chains.adapters.length <= 5 ? parseInt(2000 / chains.adapters.length) : 400) // each node should be checked every 2000sec across all chains
    }
  }
  setTimeout(main, 0)
}

async function handle_node(node, chain) {
  const node_is_okay = localDisapprovals.includes(node.url) ? false : localApprovals.includes(node.url) || await is_node_okay(node)
  node_is_okay ? localApprovals.push(node.url) : localDisapprovals.push(node.url)
  log.debug(`Node ${node.owner} is ${node_is_okay}`)
  if(node_is_okay && !node.is_active) {
    log.info(`Node ${node.owner} is okay, approving`)
    return approve(node, chain)
  }
  if(!node_is_okay && node.is_active) {
    log.info(`Node ${node.owner} is down, disapproving`)
    return disapprove(node, chain)
  }
}

async function approve(node, chain) {
  if(needs_my_approval(node, chain)) {
    log.debug(`Node ${node.owner} needs my approval`)
    return execute_transaction(node, 'peerappr', chain)
  } else {
    log.debug(`Node ${node.owner} already approved by me`)
  }
}

async function disapprove(node, chain) {
  if(needs_my_disapproval(node, chain)) {
    log.debug(`Node ${node.owner} needs my disapproval`)
    return execute_transaction(node, 'peerdisappr', chain)
  } else {
    log.debug(`Node ${node.owner} already disapproved by me`)
  }
}

function needs_my_approval(node, chain) {
  const approval = approvals[node.owner]
  log.debug(`needs_my_approval: approval: ${approval}`)
  if(!approval) {
    return true
  }
  // Only approve if we haven't already approved this request
  return !approval.includes(chain.config.nodeAccount)
}

function needs_my_disapproval(node, chain) {
  const disapproval = disapprovals[node.owner]
  log.debug(`Node ${node.owner} disapproval: ${disapproval}`)
  if(!disapproval) {
    return true
  }
  // Only disapprove if we haven't already disapproved this request
  return !disapproval.includes(chain.config.nodeAccount)  
}

async function get_approvals(chain) {
  const res = await chain.eos.getTableRows({json:true, scope: chain.config.contract, code: chain.config.contract, table: 'peerapproval', limit:100})
  log.debug(`get_approvals: ${JSON.stringify(res.rows,null, 2)}`)
  return res.rows.reduce((a, b) => {
    if(!is_expired(b)) {
      a[b.node] = b.approved_by
    }
    return a
  }, {})
}

async function get_disapprovals(chain) {
  const res = await chain.eos.getTableRows({json:true, scope: chain.config.contract, code: chain.config.contract, table: 'peerdisappr', limit:100})
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

async function execute_transaction(node, action_name, chain) {
  const actions = [{
    account: chain.config.contract,
    name: action_name,
    authorization: [{
      actor: chain.config.nodeAccount,
      permission: chain.config.watchdogPermission.permission,
    }],
    data: {
      sender: chain.config.nodeAccount,
      owner: node.owner,
    }
  }]
  try { 
    const res = chain.eos.transaction({actions})
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
async function get_nodes(chain) {
  const res = await chain.eos.getTableRows({json:true, scope: chain.config.contract, code: chain.config.contract, table: 'nodes', limit:100})
  return res.rows.filter(x => x.owner != chain.config.nodeAccount)
}

async function should_watchdog_run(chain) {
  const res = await chain.eos.getAbi({account_name: chain.config.contract})
  const table_names = res.abi.tables.map(x => x.name)
  // console.log(JSON.stringify(table_names, null, 2))
  return table_names.includes('peerapproval')
}

async function check_permissions(chain) {
  const res = await chain.eos.getAccount(chain.config.nodeAccount)
  const watchdog_perm = res.permissions.filter(x => x.perm_name == chain.config.watchdogPermission.permission)[0]
  
  if(!watchdog_perm) {
    return `No permission found with name ${chain.config.watchdogPermission.permission}`
  }
  // console.log("watchdog_perm.required_auth: ", JSON.stringify(watchdog_perm.required_auth, null, 2))
  const auth = watchdog_perm.required_auth
  
  if(auth.threshold != 1) {
    return "Threshold should be 1"
  }
  
  const configured_public_key = eosjs_ecc.privateToPublic(chain.config.watchdogPermission.key)
  
  if(auth.keys[0].key != configured_public_key) {
    return `Key is ${auth.keys[0].key} but configured key is ${configured_public_key}`
  }  
}

main()

