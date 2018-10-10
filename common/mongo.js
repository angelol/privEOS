'use strict'
import MongoClient from 'mongodb'
import Promise from 'bluebird'

const mongoUrl = 'mongodb://localhost:27017'
const dbName = 'EOS'

function getMongoConnection(url) {
  return MongoClient.connect(url, { 
		promiseLibrary: Promise, 
		useNewUrlParser: true,
	})
  .disposer(conn => conn.close())
}

export function mongo(fun) {
  return Promise.using(getMongoConnection(mongoUrl), fun)
}

export function get_original_nodes(contract, file) {
  return mongo(conn => {
    return conn.db('EOS').collection('action_traces')
      .find({"act.account" : contract, "act.data.file": file})
			.sort({"receipt.global_sequence": -1})
			.toArray()
      .then((items) => {
        const trace = items[0]
        if(trace) {
          console.log("trace: ", trace)
          return JSON.parse(trace.act.data.data)
        } else {
          return []
        }
      })
  })
}