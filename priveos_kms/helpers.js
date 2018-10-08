import Eos from 'eosjs'
import config from '../common/config'

const eos = Eos({httpEndpoint: config.httpEndpoint, chainId: config.chainId})

export function get_public_key(account_name, perm_name) {
	return eos.getAccount(account_name)
	.then((x) => {
		return x.permissions.filter(perm => perm.perm_name == perm_name)[0].required_auth.keys[0].key
	})
}