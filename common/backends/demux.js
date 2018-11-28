import { mongo } from '../mongo.js'
import config from '../config'
import assert from 'assert'

function get_store_trace(dappcontract, file) {
  return mongo.run(db => {
    return db.collection('store')
      .find({
        "name": "store",
        "account": config.contract,
        "data.contract": dappcontract,
        "data.file": file,
        "name": "store",
      })
      .sort({"blockNumber": -1})
      .limit(1)
      .toArray()
      .then((items) => {
        const trace = items[0]
        assert.ok(trace, "Backend Error, no store action found")
        return trace.data
      })
  })
}

function get_accessgrant_trace(dappcontract, user, file) {
  // console.log(`get_accessgrant_trace: ${user} ${file}`)
  return mongo.run(db => {
    const params = {
      "account" : config.contract, 
      "name": "accessgrant",
      "data.file": file,
      "data.user": user,
      "data.contract": dappcontract,
    }
    // console.log("params: ", params)
    return db.collection('accessgrant')
      .find(params)
			.sort({"blockNumber": -1})
      .limit(1)
			.toArray()
      .then((items) => {
        console.log("items: ", items)
        const trace = items[0]
        assert.ok(trace, "Backend Error, no accessgrant action found")
				console.log("accessgrant check trace: ", trace.data);
        return trace.data
      })      
  })
}

// get_accessgrant_trace("priveosbob11", "e8203b05-300b-4e8c-b7eb-54395a2f3498")
// .then(x => console.log(x))

export {
  get_store_trace,
  get_accessgrant_trace,
}