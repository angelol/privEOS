const mongo = require('../mongo.js')
const config = require('../config')
const assert = require('assert')
const log = require('loglevel')
global.Promise = require('bluebird')
log.setDefaultLevel(config.logLevel)

async function store_data(file, data, hash, owner, dappcontract) {
  const db = await mongo.db()
  const doc = {
    file,
    data,
    owner,
    hash,
    dappcontract,
    created_at: new Date(),
   }
  await db.collection('data').insertOne(doc).timeout(100, "Timeout while Backend.store_data")
}

async function get_store_trace(dappcontract, file, timeout_seconds=0) {
  const db = await mongo.db()
  const start = new Date()
  let trace
  while(true) {
    const items = await db.collection('store')
      .find({
        "name": "store",
        "account": config.contract,
        "data.contract": dappcontract,
        "data.file": file,
      })
      .sort({"blockNumber": -1})
      .limit(1)
      .toArray().timeout(100, "Timeout while Backend.get_store_trace")
    trace = items[0]
    if(trace) {
      break
    } 
    const now = new Date()
    if( (now-start) > timeout_seconds*1000 ) {
      break
    }
    await Promise.delay(100)
  }

  assert.ok(trace, "Backend Error, no store action found")
  return trace.data
}

async function get_accessgrant_trace(dappcontract, user, file, timeout_seconds=0) {
  log.debug(`get_accessgrant_trace: ${user} ${file}`)
  const db = await mongo.db()
  const start = new Date()
  let trace
  while(true) {
    const params = {
      "account" : config.contract, 
      "name": "accessgrant",
      "data.file": file,
      "data.user": user,
      "data.contract": dappcontract,
    }
    const items = await db.collection('accessgrant')
      .find(params)
  		.sort({"blockNumber": -1})
      .limit(1)
  		.toArray().timeout(100, "Timeout while Backend.get_accessgrant_trace")
    trace = items[0]
    if(trace) {
      break
    }
    const now = new Date()
    if( (now-start) > timeout_seconds*1000 ) {
      break
    }
    await Promise.delay(100)
  }
  assert.ok(trace, "Backend Error, no accessgrant action found")
	log.debug("accessgrant check trace: ", trace.data);
  return trace.data
}

module.exports = {
  store_data,
  get_store_trace,
  get_accessgrant_trace,
}