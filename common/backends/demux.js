import { mongo } from '../mongo.js'
import config from '../config'
import assert from 'assert'

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
  await db.collection('data').insertOne(doc)
}

async function get_store_trace(dappcontract, file) {
  const db = await mongo.db()
  const items = await db.collection('store')
    .find({
      "name": "store",
      "account": config.contract,
      "data.contract": dappcontract,
      "data.file": file,
    })
    .sort({"blockNumber": -1})
    .limit(1)
    .toArray()
  const trace = items[0]
  assert.ok(trace, "Backend Error, no store action found")
  return trace.data
}

async function get_accessgrant_trace(dappcontract, user, file) {
  // console.log(`get_accessgrant_trace: ${user} ${file}`)
  const db = await mongo.db()
  const params = {
    "account" : config.contract, 
    "name": "accessgrant",
    "data.file": file,
    "data.user": user,
    "data.contract": dappcontract,
  }
  // console.log("params: ", params)
  const items = await db.collection('accessgrant')
    .find(params)
		.sort({"blockNumber": -1})
    .limit(1)
		.toArray()
  console.log("items: ", items)
  const trace = items[0]
  assert.ok(trace, "Backend Error, no accessgrant action found")
	console.log("accessgrant check trace: ", trace.data);
  return trace.data
}

export {
  store_data,
  get_store_trace,
  get_accessgrant_trace,
}