'use strict'
import restify from 'restify'
import assert from 'assert'
import eosjs_ecc from 'eosjs-ecc'
import ByteBuffer from 'bytebuffer'

import config from '../common/config'
import { get_store_trace } from '../common/mongo'
import { check_permissions } from './helpers'

var PORT;
var nodeAccount;

if(process.argv[2]) {
	PORT = process.argv[2]
} else {
	PORT = config.KMS_PORT
}

if(process.argv[3]) {
	nodeAccount = process.argv[3]
} else {
	nodeAccount = config.nodeAccount
}

var server = restify.createServer({handleUncaughtExceptions: true})
server.use(restify.plugins.bodyParser())


server.post('/read/', function(req, res, next) {
  const file = req.body.file
	const requester = req.body.requester
	const dappcontract = req.body.dappcontract
	get_store_trace(dappcontract, file)
  .then((data) => {
		const nodes = data.data
		console.log("DATA: ", JSON.stringify(data))
		// console.log("Original nodes: ", JSON.stringify(nodes))
		const my_share = nodes.filter(x => x.node == nodeAccount)[0]
		console.log("my_share: ", JSON.stringify(my_share))
		assert.notEqual(null, my_share, "my_share not found!")
		
		// decrypt using the private key of my node
		const plaintext = eosjs_ecc.Aes.decrypt(config.privateKey, data.public_key, my_share.nonce, ByteBuffer.fromHex(my_share.message).toBinary(), my_share.checksum)
		
		check_permissions(requester, file)
		.then(recipient_public_key => {
			console.log("User is authorised, continuing")
			// encrypt using the public_key of the requester
			// so only the requester will be able to decrypt with his private key
			const share = eosjs_ecc.Aes.encrypt(config.privateKey, recipient_public_key, String(plaintext))	
			// console.log("Share: ", JSON.stringify(share))			
			const data = {
				message: share.message.toString('hex'),
				nonce: String(share.nonce),
				checksum: share.checksum,
				public_key: my_share.public_key,
			}
			res.send(data)
		})
		.catch(err => {
			console.log(err)
			res.send("Not authorised")
		})
	})
  next()
})

server.on('InternalServer', function(req, res, err, callback) {
  // this will get fired first, as it's the most relevant listener
	console.log('InternalServer')
  return callback()
})

server.on('uncaughtException', function(req, res, route, err) {
    // this event will be fired, with the error object from above:
    // ReferenceError: x is not defined
		console.log('uncaughtException ', err)
})

server.listen(PORT, function() {
  console.log('%s listening at %s', server.name, server.url)
})



