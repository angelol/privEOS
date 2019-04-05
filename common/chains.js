const config = require('../common/config')
const Eos = require('eosjs')
const Mongo = require('../common/mongo')
const log = require('../common/log')

let defaultChainId
if(config.defaultChainId) {
  defaultChainId = config.defaultChainId
} else {
  // Jungle Testnet
  defaultChainId = 'e70aaab8997e1dfce58fbfac80cbbb8fecec7b99cf982a9444273cbc64c41473'

} 

// Stay backwards compatible with the single-chain-style config format
if(!config.chains) {
    config.chains = [
      // deep copy
      JSON.parse(JSON.stringify(config))
    ]
}

if(process.argv[3]) {
  log.warn(`Overwriting nodeAccount with cli argument: ${process.argv[3]}`)
	config.chains = config.chains.map(chain => {
		return {
			...chain,
			nodeAccount: process.argv[3],
		}
	})
}


config.chains.forEach((chainConfig, index) => {
    if(!chainConfig.watchdogPermission) {
        log.error(`Configuration error in chain #${index}: Please add "watchdogPermission" to common/config.js`)
        process.exit(1)
    }
})

const adapters = config.chains.map(chainConfig => {
    // console.log('chainConfig', chainConfig, chainConfig.watchdogPermission.key)
    return {
        eos: Eos({
            httpEndpoint: chainConfig.httpEndpoint, 
            chainId: chainConfig.chainId,
            keyProvider: [chainConfig.watchdogPermission.key],
        }),
        config: chainConfig,
        mongo: new Mongo(config.mongoUrl, chainConfig.dbName)
    }
})

function get_chain(chainId) {
  return adapters.find(x => x.config.chainId == chainId)
}

module.exports = {
    adapters,
    get_chain,
    defaultChainId,
}