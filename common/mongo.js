import MongoClient from 'mongodb'
import Promise from 'bluebird'
import config from './config'
import assert from "assert"


export class Mongo {
  constructor(url, dbName) {
    this.url = url
    this.dbName = dbName
  }

  connect() {
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

  run(fun) {
    return this.connect()
    .then(conn => {
      return fun(conn.db(this.dbName))
    })
  }
}


export const mongo = new Mongo(config.mongoUrl, config.dbName)

export function get_store_trace(dappcontract, file) {
  return mongo.run(db => {
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

