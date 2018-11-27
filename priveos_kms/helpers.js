import Eos from 'eosjs'
import Backend from '../common/backend'
import Promise from 'bluebird'
import config from '../common/config'

const eos = Eos({httpEndpoint: config.httpEndpoint, chainId: config.chainId})
export class UserNotAuthorized extends Error {}

export function get_public_key(user, file) {
	return Backend.get_accessgrant_trace(user, file)
	.then(accessgrant_trace => {
		if(!accessgrant_trace) {
			throw new UserNotAuthorized("No authorizing accessgrant transaction found")
		}
		return Backend.get_store_trace(accessgrant_trace.contract, file)		
    .then(store_trace => {
			if(!store_trace) {
				// if there is no matching store_trace, it means someone is trying something funny
				throw new UserNotAuthorized("Nice try, zeroC00l")
			}
			return accessgrant_trace.public_key
    })
  })
}