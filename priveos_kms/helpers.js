import Eos from 'eosjs'
import Backend from '../common/backend'
import Promise from 'bluebird'
import config from '../common/config'

const eos = Eos({httpEndpoint: config.httpEndpoint, chainId: config.chainId})
export class UserNotAuthorized extends Error {}

export function get_public_key(dappcontract, user, file) {
	return Promise.all([
		Backend.get_store_trace(dappcontract, file),
		Backend.get_accessgrant_trace(dappcontract, user, file),
	])
	.then(([store_trace, accessgrant_trace]) => {
		if(!store_trace || !accessgrant_trace) {
			throw new UserNotAuthorized("User is not authorised")
		}
		return accessgrant_trace.public_key
	})
}