import { mongo } from '../mongo.js'
import config from '../config'

function get_store_trace(dappcontract, file) {
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
      .limit(1)
      .toArray()
      .then((items) => {
        const trace = items[0]
        return JSON.parse(trace.act.data.data)
      })
  })
}

function get_accessgrant_trace(user, file) {
  return mongo.run(db => {
    return db.collection('action_traces')
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
      .then((items) => {
        const trace = items[0]
				console.log("accessgrant check trace: ", trace);
        return trace
      })
  })
}

export {
  get_store_trace,
  get_accessgrant_trace,
}
