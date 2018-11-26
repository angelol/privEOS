'use strict'
const MongoClient = require('mongodb')
const Promise = require('bluebird')
const config = require('./config')
const assert = require("assert")

// var _mongodb
// 
// var running = false
// function mongo_connect() {
//   if(running) return
//   running = true
//   if(_mongodb) {
//     console.log("Already connected, returning conn")
//     return new Promise((resolve, reject) => {
//       return resolve(_mongodb)
//     })
//   } 
//   return MongoClient.connect(config.mongoUrl, { 
//     promiseLibrary: Promise, 
//     useNewUrlParser: true,
//   })
//   .then(db => {
//     assert.ok(db, "Could not establish connection to MongoDB")
//     console.log("Mongodb connection established")
//     _mongodb = db
//     running = false
//     return _mongodb
//   })
//   .catch(err =>{
//     running = false
//     throw err
//   })
// }
// 
// function mongo(dbName, fun) {
//   return mongo_connect()
//   .then(conn => {
//     return fun(conn.db(config.dbName))    
//   })
// }

function Mongo (url, dbName){
  this.url = url
  this.dbName = dbName
}

Mongo.prototype.connect = function() {
  if(this.connection) {
    // console.log("Already connected, returning conn")
    return new Promise((resolve, reject) => {
      return resolve(this.connection)
    })
  } else {
    // console.log("this.url: ", this.url)
    return MongoClient.connect(this.url, { 
      promiseLibrary: Promise, 
      useNewUrlParser: true,
    })
    .then(conn => {
      assert.ok(conn, "Could not establish connection to MongoDB")
      // console.log("Mongodb connection established")
      this.connection = conn
      return this.connection
    })
  }    
}

Mongo.prototype.run = function(fun) {
  return this.connect()
  .then(conn => {
    return fun(conn.db(this.dbName))
  })
}

// export function get_store_trace(dappcontract, file) {
//   // return get_store_trace(dappContract, file)
//   //   .then(x => {
//   // 
//   //   })
//   return mongo(conn => {
//     return conn.db(config.dbName).collection('action_traces')
//       .find({
//         "act.account" : config.contract, 
//         "act.data.file": file,
//         "act.name": "store",
//         "act.data.contract": dappcontract,
//       })
// 			.sort({"receipt.global_sequence": -1})
// 			.toArray()
//       .then((items) => {
//         const trace = items[0]
//         if(trace) {
//           // console.log("trace: ", JSON.parse(trace.act.data.data).data)
//           return JSON.parse(trace.act.data.data)
//         } else {
//           return []
//         }
//       })
//   })
// }

function get_store_trace(dappcontract, file) {
  return mongo(db => {
    return db.collection('action_traces')
      .find({
        "act.account" : config.contract, 
        "act.data.file": file,
        "act.name": "store",
        "receipt.receiver": config.contract,
        "act.data.contract": dappcontract,
      })
      .sort({"receipt.global_sequence": -1})
      .toArray()
      .then((items) => {
        const trace = items[0]
        return JSON.parse(trace.act.data.data)
      })
  })
}

module.exports = {
  Mongo: Mongo,
  get_store_trace, get_store_trace,
}