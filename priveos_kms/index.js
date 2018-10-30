'use strict'
import restify from 'restify'
import assert from 'assert'
import Promise from 'bluebird'
import config from '../common/config'
import KMS from './kms'
import { UserNotAuthorized } from './helpers'

if(process.argv[2]) {
	config.KMS_PORT = process.argv[2]
}

if(process.argv[3]) {
	config.nodeAccount = process.argv[3]
}

var server = restify.createServer()
server.use(restify.plugins.bodyParser())


server.post('/read/', function(req, res, next) {
  const file = req.body.file
	const requester = req.body.requester
	const dappcontract = req.body.dappcontract
	const kms = new KMS(config)
	kms.read(file, requester, dappcontract)
	.then(data => {
		console.log("Read data from kms: ", data)
		res.send(data)
	})
	.catch(UserNotAuthorized, (err) => {
		console.log(err)
		res.send("Not authorised")
	})
	.catch(err => {
		console.log(err)
		res.send("Generic Error")
	})
  next()
})

console.log("PORT: ", config.KMS_PORT)
server.listen(config.KMS_PORT, function() {
  console.log('%s listening at %s', server.name, server.url)
})



