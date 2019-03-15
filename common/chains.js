const config = require('../common/config')
const Eos = require('eosjs')
const Mongo = require('../common/mongo')
const log = require('../common/log')

if(process.argv[3]) {
    log.warn(`Overwriting nodeAccount with cli argument: ${process.argv[3]}`)
	config.chains = config.chains.map(chain => {
		return {
			...chain,
			nodeAccount: process.argv[3],
		}
	})
}

// check only required for bps to migrate to new config file with multiple chain ids
if(!config.chains) {
    log.warn(`Configuration warning: Please migrate config to support multiple chains - single chain support will be dropped in the future. See https://github.com/rawrat/privEOS/blob/multichain-support/common/config.js-example for example.`)
    config.chains = [config]
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
    const chain = adapters.find(el => {
        return el.config.chainId == chainId
    })
    return chain
}

module.exports = {
    adapters,
    get_chain
}