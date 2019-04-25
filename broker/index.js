'use strict'
const restify = require('restify')
const corsMiddleware = require('restify-cors-middleware')

const axios = require('axios')
axios.defaults.timeout = 15000 // make sure we're not hanging forever
const Promise = require('bluebird')
const Backend = require('../common/backend')
const log = require('../common/log')
const config = require('../common/config')
const chains =  require('../common/chains')
const { URL } = require('url')
const { broker_status } = require('./status')
const Bourne = require('@hapi/bourne')
const schemas = require('./schemas')
const { get_nodes, all_nodes, contract, fetch_from_ipfs } = require('./helpers')

if(process.argv[2]) {
	config.brokerPort = process.argv[2]
}

const server = restify.createServer()
server.use(restify.plugins.bodyParser())

 
const cors = corsMiddleware({
  preflightMaxAge: 5,
  origins: ['*'],
  allowHeaders: [''],
  exposeHeaders: ['']
})
 
server.pre(cors.preflight)
server.use(cors.actual)

server.get('/broker/status/', async function(req, res, next) {
	try { 
		await broker_status(req, res)
	} catch(err) {
		log.error("Error: ", err)
		res.send(500, "Generic Error")
	}
	next()
})

server.post('/broker/store/', async function(req, res, next) {
	try { 
		await broker_store(req, res)
	} catch(err) {
		log.error("Error: ", err)
		res.send(500, "Generic Error")
	}
	next()
})

server.post('/broker/read/', async function(req, res, next) {
  log.debug('Received read requests', req.body)
	try { 
	  await broker_read(req, res)
	} catch(err) {
    log.error("Error: ", err)
    res.send(500, "Generic Error")
  }
  next()
})

async function broker_store(req, res) {
	const body = req.body

	// For older versions of priveos-client that don't send chainId
	if(!body.chainId) {
		body.chainId = chains.defaultChainId
	}

	if(!body || !body.file || !body.data || !body.owner || !body.dappcontract || !body.chainId) {
		return res.send(400, "Bad request")
	}
	log.debug("Ohai broker_store")
	const chain = chains.get_chain(body.chainId)
	const nodes = await all_nodes(chain)
	const promises = nodes.map(async node => {
		log.debug("nodes.map: ", node)
		const url = new URL('/kms/store/', node.url).href
		try {
			const res = await axios.post(url, {
					file: body.file,
					owner: body.owner,
					data: body.data,
					dappcontract: body.dappcontract,
					chainId: body.chainId,
				})
			return res
		} catch(e) {
			log.debug(`Connection to ${url} failed`)
		}
	})
	const response = await Promise.all(promises)
	log.debug('Finished Sending to all Nodes')
	res.send('okay')
}

async function broker_read(req, res) {
	const body = req.body
	log.debug("broker_read")
	
	// For older versions of priveos-client that don't send chainId
	if(!body.chainId) {
		body.chainId = chains.defaultChainId
	}
	
	if(!body || !body.file || !body.requester || !body.dappcontract || !body.txid || !body.chainId) {
		return res.send(400, "Bad request")
	}
	
	const file = body.file
	const requester = body.requester
	const dappcontract = body.dappcontract
	const timeout_seconds = body.timeout_seconds || 0
	const txid = body.txid

	const chain = chains.get_chain(body.chainId)
	
	/* Wait until the transaction with txid has propagated before continuing */
	await Backend.get_accessgrant_trace(chain, dappcontract, requester, file, txid, timeout_seconds)
	
	const store_trace = await Backend.get_store_trace(chain, dappcontract, file, timeout_seconds)
	log.debug("store_trace: ", store_trace)
	const hash = store_trace.data
	log.debug("hash: ", hash)
	
	const payload = Bourne.parse(await fetch_from_ipfs(hash))
	log.debug("payload: ", payload)
	const result = schemas.validate_any(payload, schemas.valid_json_payloads_from_ipfs)
	if(result.error) {
		log.error("Invalid format: ", payload)
		return res.send(400, "Bad request")
	}
	
	const nodes = await get_nodes(chain, payload)

	const promises = nodes.map(async node => {
		log.debug("nodes.map: ", node)
		const url = new URL('/kms/read/', node.url).href
		const res = await axios.post(url, {
				file: file,
				requester: requester,
				dappcontract: dappcontract,
				payload: payload,
				txid,
				timeout_seconds: timeout_seconds,
				chainId: body.chainId,
			})
		return res.data
	})
	log.debug("payload.threshold: ", payload.threshold)
	const shares = await Promise.some(promises, payload.threshold)
	// const shares = data.map(x => x.data)
	log.debug("Shares: ", shares )
	log.debug('Finished Sending to all Nodes')
	res.send({shares, user_key: payload.user_key})
}


server.listen(config.brokerPort, "127.0.0.1", function() {
  log.info(`Broker ${server.name} listening at ${server.url}`)
	if(process.send) {
		process.send('ready')		
	}
})

