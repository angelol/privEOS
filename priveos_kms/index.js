'use strict'
import restify from 'restify'
import assert from 'assert'
var config
try {
	config = require('../common/config')
} catch(e) {
	console.log("../common/config.js not found. Please copy ../common/config.js-example to ../common/config.js and modify to your needs.")
	process.exit(1)
}
import KMS from './kms'

if(process.argv[2]) {
	config.KMS_PORT = process.argv[2]
}

if(process.argv[3]) {
	config.nodeAccount = process.argv[3]
}

var server = restify.createServer()
server.use(restify.plugins.bodyParser())


server.post('/read/', async function(req, res, next) {
	try {
		if(!req.body || !req.body.file || !req.body.requester || !req.body.dappcontract) {
	    return res.send(400, "Bad request")
	  }
		
	  const file = req.body.file
		const requester = req.body.requester
		const dappcontract = req.body.dappcontract
		const kms = new KMS(config)
		const data = await kms.read(file, requester, dappcontract)
		console.log("Read data from kms: ", data)
		res.send(data)
	} catch(e) {
		if(e instanceof KMS.UserNotAuthorized) {
			console.log(e)
			res.send("Not authorised")
		} else {
			console.log(e)
			res.send("Generic Error")
		}
	}
  next()
})

console.log("PORT: ", config.KMS_PORT)
server.listen(config.KMS_PORT, function() {
  console.log('%s listening at %s', server.name, server.url)
})



