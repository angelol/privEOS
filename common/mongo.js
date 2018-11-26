'use strict'
const MongoClient = require('mongodb')
const Promise = require('bluebird')
const config = require('./config')

var _mongodb

MongoClient.connect(config.mongoUrl, { 
  promiseLibrary: Promise, 
  useNewUrlParser: true,
})
.then(db => {
  _mongodb = db
})

function mongo(fun) {
  return fun(_mongodb.db(config.dbName))
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
  mongo: mongo,
  get_store_trace, get_store_trace,
}