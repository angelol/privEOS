import Eos from 'eosjs'
import config from '../common/config'
import { mongo } from '../common/mongo'
import Promise from 'bluebird'

const eos = Eos({httpEndpoint: config.httpEndpoint, chainId: config.chainId})
export class UserNotAuthorized extends Error {}

export function check_permissions(user, file) {
	return mongo(conn => {
    return conn.db('EOS').collection('action_traces')
      .find({
				"act.account" : config.contract, 
				"act.data.file": file,
				"act.name": "accessgrant",
				"receipt.receiver": config.contract,
				"act.data.user": user,
			})
			.sort({"receipt.global_sequence": -1})
			.toArray()
      .then((items) => {
        const trace = items[0]
				console.log("accessgrant check trace: ", trace);
        return trace
      })
  }).then(accessgrant_trace => {
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
	        const store_trace = items[0]
					console.log("store_trace: ", store_trace)
	        if(accessgrant_trace.act.data.contract == store_trace.act.data.contract) {
						return accessgrant_trace.act.data.public_key
					} else {
						throw new UserNotAuthorized("Nice try, zeroC00l")
					}
	      })
	  })
	})
}