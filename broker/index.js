'use strict'
import restify from 'restify'
import corsMiddleware from 'restify-cors-middleware'

import axios from 'axios'
axios.defaults.timeout = 2500;

import Promise from 'bluebird'

import config from '../common/config'
import { get_node_urls, contract } from './helpers'
import { get_store_trace } from '../common/mongo'

const server = restify.createServer({handleUncaughtExceptions: true})
server.use(restify.plugins.bodyParser())

 
const cors = corsMiddleware({
  preflightMaxAge: 5,
  origins: ['*'],
  allowHeaders: [''],
  exposeHeaders: ['']
})
 
server.pre(cors.preflight)
server.use(cors.actual)



server.post('/read/', function(req, res, next) {
  // console.log('Received read requests', req.body)
  const file = req.body.file
  const requester = req.body.requester
  
  Promise.all([
    get_store_trace(file),
    get_node_urls(file),
  ])
  .then(([store_trace, nodes]) => {
    console.log("Store Trace: ", store_trace)
    console.log("Nodes: ", nodes)
    console.log('Got Node Urls: ', nodes)
    const promises = nodes.map(node => {
      // console.log("nodes.map: ", node)
      return axios.post(node.url + '/read/', {
          file: file,
          requester: requester,
        })
    })
    Promise.some(promises, store_trace.threshold)
    .then(data => {
      return data.map(x => {
        // console.log("DATAX: ", x.data)
        return x.data
      })
    })
    .then((data) => {
      console.log('Finished Sending to all Nodes')
      res.send(data)
    })
  })
  .catch(err => {
    console.log("Error: ", err)
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
server.listen(config.BROKER_PORT, function() {
  console.log('Broker %s listening at %s', server.name, server.url)
})

