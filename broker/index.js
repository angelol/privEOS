'use strict'
import restify from 'restify'
import corsMiddleware from 'restify-cors-middleware'

import axios from 'axios'
axios.defaults.timeout = 2500;

import Promise from 'bluebird'
import Backend from '../common/backend'
var config
try {
	config = require('../common/config')
} catch(e) {
	console.log("../common/config.js not found. Please copy ../common/config.js-example to ../common/config.js and modify to your needs.")
	process.exit(1)
}
import { get_node_urls, contract } from './helpers'

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



server.post('/read/', async function(req, res, next) {
  // console.log('Received read requests', req.body)
	try { 
	  broker_main(req, res)
	} catch(err) {
    console.log("Error: ", err)
    res.send(500, "Generic Error")
  }
  next()
})

async function broker_main(req, res) {
	if(!req.body || !req.body.file || !req.body.requester || !req.body.dappcontract) {
		return res.send(400, "Bad request")
	}
	
	const file = req.body.file
	const requester = req.body.requester
	const dappcontract = req.body.dappcontract
	

	const store_trace = await Backend.get_store_trace(dappcontract, file)
	const payload = JSON.parse(store_trace.data)
	const nodes = await get_node_urls(payload, dappcontract, file)

	const promises = nodes.map(node => {
		// console.log("nodes.map: ", node)
		return axios.post(node.url + '/read/', {
				file: file,
				requester: requester,
				dappcontract: dappcontract,
			})
	})
	console.log("payload.threshold: ", payload.threshold)
	let data = await Promise.some(promises, payload.threshold)
	data = data.map(x => x.data)
	console.log('Finished Sending to all Nodes')
	res.send(data)
}

server.listen(config.BROKER_PORT, function() {
  console.log('Broker %s listening at %s', server.name, server.url)
})

