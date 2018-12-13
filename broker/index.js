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
import { get_node_urls, all_nodes, contract } from './helpers'

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

server.post('/store/', async function(req, res, next) {
	try { 
		await broker_store(req, res)
	} catch(err) {
		console.log("Error: ", err)
		res.send(500, "Generic Error")
	}
	next()
})

server.post('/read/', async function(req, res, next) {
  // console.log('Received read requests', req.body)
	try { 
	  await broker_read(req, res)
	} catch(err) {
    console.log("Error: ", err)
    res.send(500, "Generic Error")
  }
  next()
})

async function broker_store(req, res) {
	const body = req.body
	if(!body || !body.file || !body.data || !body.owner || !body.dappcontract) {
		return res.send(400, "Bad request")
	}
	console.log("Ohai broker_store")
	const nodes = await all_nodes()
	const promises = nodes.map(node => {
		// console.log("nodes.map: ", node)
		return axios.post(node.url + '/store/', {
				file: body.file,
				owner: body.owner,
				data: body.data,
				dappcontract: body.dappcontract,
			})
	})
	const response = await Promise.all(promises)
	console.log('Finished Sending to all Nodes')
	console.log("Data: ", response.data)
	res.send(response.data)
}

async function broker_read(req, res) {
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

server.listen(config.BROKER_PORT, "127.0.0.1", function() {
  console.log('Broker %s listening at %s', server.name, server.url)
})

