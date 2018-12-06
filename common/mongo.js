import MongoClient from 'mongodb'
import Promise from 'bluebird'
import config from './config'
import assert from "assert"

/**
  * MongoDB convenience class
  * Connects lazily to MongoDB and keeps a connection pool open
  * Automatically reconnects on connection failure
  * Usage: 
  * const mongo = new Mongo(mongoUrl, dbName)
  * const db = await mongo.db()
  */
export class Mongo {
  constructor(url, dbName) {
    this.url = url
    this.dbName = dbName
  }

  /**
    * Returns a promise to the mongodb instance.
    * If already connected, this promise resolves instantly
    */
  async db() {
    if(this._db) {
      // console.log("Already connected, returning this.db")
      return this._db
    }
    // console.log("this.url: ", this.url)
    const conn = await MongoClient.connect(this.url, { 
      promiseLibrary: Promise, 
      useNewUrlParser: true,
      autoReconnect: true,
      reconnectTries: Number.MAX_VALUE,
      bufferMaxEntries: 0,
    })
    assert.ok(conn, "Could not establish connection to MongoDB")
    // console.log("Mongodb connection established")
    this._db = conn.db(this.dbName)
    return this._db
  }
}
export const mongo = new Mongo(config.mongoUrl, config.dbName)



