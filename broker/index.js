'use strict'
import restify from 'restify'
import assert from 'assert'
import Eos from 'eosjs'
import axios from 'axios'
import eosjs_ecc from 'eosjs-ecc'
import ByteBuffer from 'bytebuffer'
import Promise from 'bluebird'
import MongoClient from 'mongodb'

const mongoUrl = 'mongodb://localhost:27017'
const dbName = 'EOS'
const contract = 'priveosrules'
const httpEndpoint = 'http://localhost:8888'
const chainId = 'cf057bbfb72640471fd910bcb67639c22df9f92470936cddc1ade0e2f2e7dc4f'

const eos = Eos({httpEndpoint, chainId})

var PORT = 4000

function getMongoConnection(url) {
  return MongoClient.connect(url, { 
		promiseLibrary: Promise, 
		useNewUrlParser: true,
	})
  .disposer(conn => conn.close())
}

function nodes(file) {
  return Promise.using(getMongoConnection(mongoUrl), conn => {
    return conn.db('EOS').collection('action_traces')
      .find({"act.account" : contract, "act.data.file": file})
			.sort({"receipt.global_sequence": -1})
			.toArray()
      .then((items) => {
        const trace = items[0]
        if(trace) {
          return trace.act.data.data
        } else {
          return []
        }
      })
  })
}   
  



const server = restify.createServer({handleUncaughtExceptions: true})
server.use(restify.plugins.bodyParser())


server.post('/read/', function(req, res, next) {
  const file = req.body.file
  const requester = req.body.requester
  
  Promise.map(nodes(file), (node) => {
    return axios.post(node.address+'/read/', {
      file: file,
      requester: requester,
    })
    .then((response) => {
      const data = response.data
      // console.log(data)
      return data
    })
  })
  .then((x) => {
    console.log("Data from nodes: ", x)
    res.send(x)
  })
  next()
})




server.listen(PORT, function() {
  console.log('Broker %s listening at %s', server.name, server.url)
})
