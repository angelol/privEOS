'use strict'
import MongoClient from 'mongodb'
import Promise from 'bluebird'
import config from './config'

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
      .find({
        "act.account" : contract, 
        "act.data.file": file,
        "act.name": "store",
      })
			.sort({"receipt.global_sequence": -1})
			.toArray()
      .then((items) => {
        const trace = items[0]
        if(trace) {
          // console.log("trace: ", JSON.parse(trace.act.data.data).data)
          return JSON.parse(trace.act.data.data)
        } else {
          return []
        }
      })
  })
}


export function get_store_trace(file) {
  return mongo(conn => {
    return conn.db('EOS').collection('action_traces')
      .find({
        "act.account" : config.contract, 
        "act.data.file": file,
        "act.name": "store",
        "receipt.receiver": config.contract,
      })
      .sort({"receipt.global_sequence": -1})
      .toArray()
      .then((items) => {
        const trace = items[0]
        return JSON.parse(trace.act.data.data)
      })
  })
}