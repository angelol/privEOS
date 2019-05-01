'use strict'
const log = require('../common/log')
const config = require('../common/config')
const chains = require('../common/chains')
const restify = require('restify')
const eosjs_ecc = require('eosjs-ecc-priveos')
const Watchdog = require('./watchdog')

if(process.argv[2]) {
  config.watchdogPort = process.argv[2]
}

const server = restify.createServer()

let status = 'ok'

server.get('/watchdog/status/', async function(req, res, next) {
	try { 
    const errors = []
    for (const chain of chains.adapters) {
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

async function main() {
  // console.log("Ohai main config.chains: ", config.chains[0])
  for(const chain of chains.adapters) {
    console.log(`${chain.chainId} Starting watchdog`)
    const watchdog = new Watchdog(chain)
    watchdog.run()
  }
}

async function check_permissions(chain) {
  // console.log("OHAI check_permissions")
  const res = await chain.eos.getAccount(chain.config.nodeAccount)
  // console.log("res: ", res)
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
