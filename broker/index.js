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
  const file = req.body.file
  const requester = req.body.requester
  get_node_urls(file)
  .then((nodes) => {
    return Promise.map(nodes, (node) => {
      return axios.post(node.url + '/read/', {
        file: file,
        requester: requester,
      })
      .then((response) => {
        return response.data
      })
    })
  })
  .then((data) => {
    res.send(data)
  })
  next()
})

server.listen(config.BROKER_PORT, function() {
  console.log('Broker %s listening at %s', server.name, server.url)
})

