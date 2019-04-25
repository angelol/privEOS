'use strict'
const config = require('../common/config')
const log = require('../common/log')
const Demux = require('./demux')
const Bourne = require('@hapi/bourne')

// Stay backwards compatible with the single-chain-style config format
if(!config.chains) {
    config.chains = [
      // deep copy
      Bourne.parse(JSON.stringify(config))
    ]
}

function main() {
  for(const chain of config.chains) {
    log.info(`Starting Demux for chain ${chain.chainId}`)
    new Demux(chain)
  }
}

main()