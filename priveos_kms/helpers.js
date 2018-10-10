import Eos from 'eosjs'
import config from '../common/config'
import { mongo } from '../common/mongo'

const eos = Eos({httpEndpoint: config.httpEndpoint, chainId: config.chainId})

export function get_public_key(account_name, perm_name) {
	return eos.getAccount(account_name)
	.then((x) => {
		return x.permissions.filter(perm => perm.perm_name == perm_name)[0].required_auth.keys[0].key
	})
}

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
	        if(accessgrant_trace.act.data.contract == store_trace.act.data.contract) {
						return true
					} else {
						console.log("Nice try, zeroC00l")
						return false
					}
	      })
	  })
	})
}