'use strict'
const config = require('../common/config')
const log = require('../common/log')
const { fork } = require('child_process')
const chains = require('../common/chains')
const Demux = require('./demux')

// Stay backwards compatible with the single-chain-style config format
if(!config.chains) {
    config.chains = [
      // deep copy
      JSON.parse(JSON.stringify(config))
    ]
}

function main() {
  for(const chain of config.chains) {
    log.info(`Starting Demux for chain ${chain.chainId}`)
    new Demux(chain)
  }
}

main()