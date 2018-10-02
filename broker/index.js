const restify = require('restify');
const assert = require('assert');
const Eos = require('eosjs');
const axios = require('axios');
const eosjs_ecc = require('eosjs-ecc');
const ByteBuffer = require('bytebuffer');
const Promise = require("bluebird");
const httpEndpoint = 'http://localhost:8888';
const chainId = 'cf057bbfb72640471fd910bcb67639c22df9f92470936cddc1ade0e2f2e7dc4f';

const eos = Eos({httpEndpoint, chainId});
// var db = {};

var PORT = 4000;

if(process.argv[2]) {
	PORT = process.argv[2];
}
if(process.argv[3]) {
	this_node = process.argv[3];
}

const nodes = [
  {
    name: "testnode1",
    address: "http://localhost:3000"
  },
  {
    name: "testnode2",
    address: "http://localhost:3001"
  }
]

const server = restify.createServer({handleUncaughtExceptions: true});
server.use(restify.plugins.bodyParser());


server.post('/read/', function(req, res, next) {
  const file = req.body.file;
  const requester = req.body.requester;
  
  Promise.map(nodes, (node) => {
    return axios.post(node.address+'/read/', {
      file: file,
      requester: requester
    })
    .then((response) => {
      const data = response.data;
      // console.log(data);
      return data;
    });
  })
  .then((x) => {
    console.log("Data from nodes: ", x);
    res.send(x);
  });
  next();
});




server.listen(PORT, function() {
  console.log('%s listening at %s', server.name, server.url);
});
