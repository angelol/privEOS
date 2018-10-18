'use strict'
import MongoClient from 'mongodb'
import Promise from 'bluebird'
import config from './config'

function getMongoConnection(url) {
  return MongoClient.connect(url, { 
		promiseLibrary: Promise, 
		useNewUrlParser: true,
	})
  .disposer(conn => conn.close())
}

export function mongo(fun) {
  return Promise.using(getMongoConnection(config.mongoUrl), fun)
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


export function get_store_trace(dappcontract, file) {
  return mongo(conn => {
    return conn.db(config.dbName).collection('action_traces')
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
