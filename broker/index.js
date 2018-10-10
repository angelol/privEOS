'use strict'
import restify from 'restify'
import assert from 'assert'

import axios from 'axios'
import Promise from 'bluebird'

import config from '../common/config'
import { get_node_urls, contract } from './helpers'

const server = restify.createServer({handleUncaughtExceptions: true})
server.use(restify.plugins.bodyParser())



server.post('/read/', function(req, res, next) {
  console.log('Received read requests', req.body)
  const file = req.body.file
  const requester = req.body.requester
  get_node_urls(file)
  .then((nodes) => {
    console.log('Got Node Urls: ', nodes)
    return Promise.map(nodes, (node) => {
      console.log('Post READ request to node', node)
      return axios.post(node.url + '/read/', {
        file: file,
        requester: requester,
      })
      .then((response) => {
        console.log('Received Response from node', response.data)
        return response.data
      })
      .catch((err) => {
        console.error('Error while posting READ request to node', err)
      })
    })
  })
  .then((data) => {
    console.log('Finished Sending to all Nodes')
    res.send(data)
  })
  next()
})

server.listen(config.BROKER_PORT, function() {
  console.log('Broker %s listening at %s', server.name, server.url)
})

