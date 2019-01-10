'use strict'
const restify = require('restify')
const log = require('loglevel')

var config
try {
	config = require('../common/config')
	log.setDefaultLevel(config.logLevel)
} catch(e) {
	log.error("../common/config.js not found. Please copy ../common/config.js-example to ../common/config.js and modify to your needs.")
	process.exit(1)
}
const KMS = require('./kms')

if(process.argv[2]) {
	config.kmsPort = process.argv[2]
}

if(process.argv[3]) {
	config.nodeAccount = process.argv[3]
}

var server = restify.createServer()
server.use(restify.plugins.bodyParser())

server.get('/kms/status/', async function(req, res, next) {
	try { 
		res.send({
	    status: 'ok',
		})
	} catch(err) {
		log.error("Error: ", err)
		res.send(500, "Generic Error")
	}
	next()
})

server.post('/kms/store/', async function(req, res, next) {
	try {
		const body = req.body
		if(!body || !body.file || !body.data || !body.owner || !body.dappcontract) {
	    return res.send(400, "Bad request")
	  }
		log.debug("Ohai Store")
		const kms = new KMS(config)
		const data = await kms.store(body.file, body.data, body.owner, body.dappcontract)
		res.send("okay")
	} catch(e) {
		if(e instanceof KMS.UserNotAuthorized) {
			log.warn(e)
			res.send(403, "Not authorised")
		} else {
			log.warn(e)
			res.send(500, "Generic Error")
		}
	}
  next()
})

server.post('/kms/read/', async function(req, res, next) {
	const body = req.body
	try {
		if(!body || !body.file || !body.requester || !body.dappcontract || !body.payload) {
	    return res.send(400, "Bad request")
	  }
		const kms = new KMS(config)
		log.debug("calling kms.read")
		const data = await kms.read(body.file, body.requester, body.dappcontract, body.payload)
		log.debug("Read data from kms: ", data)
		res.send(data)
	} catch(e) {
		if(e instanceof KMS.UserNotAuthorized) {
			log.warn(e)
			res.send(403, "Not authorised")
		} else {
			log.error(e)
			res.send(500, "Generic Error")
		}
	}
  next()
})

server.listen(config.kmsPort, "127.0.0.1", function() {
  log.info('PrivEOS KMS listening on port ', config.kmsPort)
	if(process.send) {
		process.send('ready')		
	}
})



