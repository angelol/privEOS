'use strict'
import restify from 'restify'
import MongoClient from 'mongodb'
import assert from 'assert'
import Eos from 'eosjs'
import eosjc_ecc from 'eosjs-ecc'
import ByteBuffer from 'bytebuffer'

const httpEndpoint = 'http://localhost:8888'
const chainId = 'cf057bbfb72640471fd910bcb67639c22df9f92470936cddc1ade0e2f2e7dc4f'

const eos = Eos({httpEndpoint, chainId})
// var db = {}
const mongoUrl = 'mongodb://localhost:27017'
const dbName = 'EOS'
const contract = 'priveosrules'

var this_node = 'testnode1'
var PORT = 3000

if(process.argv[2]) {
	PORT = process.argv[2]
}
if(process.argv[3]) {
	this_node = process.argv[3]
}


const private_key = '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3'

var server = restify.createServer({handleUncaughtExceptions: true})
server.use(restify.plugins.bodyParser())


server.post('/read/', function(req, res, next) {
  let file = req.body.file
  MongoClient.connect(mongoUrl, function(err, client) {
    assert.equal(null, err)
    console.log("Connected successfully to server")

    const db = client.db(dbName)
    db.collection('action_traces').find({"act.account" : contract, "act.data.file": file}).sort({"receipt.global_sequence": -1}).toArray(function(err, items) {
      assert.equal(null, err)
      const trace = items[0]
			assert.notEqual(null, trace, "Nothing found")
			console.log("trace.act.data: ", trace.act.data.data)
			const data = JSON.parse(trace.act.data.data)
			
			// get data relevante for my node
			const my_share = data[this_node]
			
			// decrypt using the private key of my node
			const plaintext = eosjs_ecc.Aes.decrypt(private_key, my_share.public_key, my_share.nonce, ByteBuffer.fromHex(my_share.message).toBinary(), my_share.checksum)
			
			// permission check with the blockchain to be implemented here
			
			// encrypt using the public_key of the requester
			// so only the requester will be able to decrypt with his private key
			get_public_key(req.body.requester, "active")
			.then((public_key) => {
				const share = eosjs_ecc.Aes.encrypt(private_key, public_key, String(plaintext))				
				const data = {
					message: share.message.toString('hex'),
					nonce: String(share.nonce),
					checksum: share.checksum,
					public_key: public_key
				}
				res.send(data)
			})
    })

    client.close()
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

async function get_public_key(account_name, perm_name) {
  const x = await eos.getAccount(account_name)
  for (const perm of x.permissions) {
    // console.log(perm.perm_name)
    if(perm.perm_name == perm_name) {
      return perm.required_auth.keys[0].key
    }
  }
}