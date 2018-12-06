import { mongo } from '../mongo.js'
import config from '../config'

async function get_store_trace(dappcontract, file) {
  const db = await mongo.db()
  const items = await db.collection('action_traces')
    .find({
      "act.account" : config.contract, 
      "act.data.file": file,
      "act.name": "store",
      "receipt.receiver": config.contract,
      "act.data.contract": dappcontract,
    })
    .sort({"receipt.global_sequence": -1})
    .limit(1)
    .toArray()
  const trace = items[0]
  return JSON.parse(trace.act.data.data)
}

async function get_accessgrant_trace(user, file) {
  const db = await mongo.db()
  const items = await db.collection('action_traces')
    .find({
			"act.account" : config.contract, 
			"act.data.file": file,
			"act.name": "accessgrant",
			"receipt.receiver": config.contract,
			"act.data.user": user,
		})
		.sort({"receipt.global_sequence": -1})
    .limit(1)
		.toArray()
  const trace = items[0]
	console.log("accessgrant check trace: ", trace);
  return trace
}

export {
  get_store_trace,
  get_accessgrant_trace,
}
