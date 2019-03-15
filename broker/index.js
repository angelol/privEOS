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
	log.debug("broker_read")
	if(!req.body || !req.body.file || !req.body.requester || !req.body.dappcontract || !req.body.txid || !req.body.chainId) {
		return res.send(400, "Bad request")
	}
	
	const file = req.body.file
	const requester = req.body.requester
	const dappcontract = req.body.dappcontract
	const timeout_seconds = req.body.timeout_seconds || 0
	const txid = req.body.txid

	const chain = chains.get_chain(req.body.chainId)
	
	const store_trace = await Backend.get_store_trace(chain, dappcontract, file, timeout_seconds)
	log.debug("store_trace: ", store_trace)
	const hash = store_trace.data
	log.debug("hash: ", hash)
	
	const payload = JSON.parse(await fetch_from_ipfs(hash))
	log.debug("payload: ", payload)
	const nodes = await get_nodes(chain, payload)

	const promises = nodes.map(node => {
		log.debug("nodes.map: ", node)
		const url = new URL('/kms/read/', node.url).href
		return axios.post(url, {
				file: file,
				requester: requester,
				dappcontract: dappcontract,
				payload: payload,
				txid,
				timeout_seconds: timeout_seconds,
				chainId: req.body.chainId,
			})
	})
	log.debug("payload.threshold: ", payload.threshold)
	let data = await Promise.some(promises, payload.threshold)
	data = data.map(x => x.data)
	log.debug('Finished Sending to all Nodes')
	res.send(data)
}


server.listen(config.brokerPort, "127.0.0.1", function() {
  log.info(`Broker ${server.name} listening at ${server.url}`)
	if(process.send) {
		process.send('ready')		
	}
})

