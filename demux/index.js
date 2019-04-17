'use strict'
const config = require('../common/config')
const log = require('../common/log')
const { fork } = require('child_process')
const chains = require('../common/chains')

// Stay backwards compatible with the single-chain-style config format
if(!config.chains) {
    config.chains = [
      // deep copy
      JSON.parse(JSON.stringify(config))
    ]
}

log.info('Start Demux Process Manager')

const processes = config.chains.map(chainConfig => {
    const chainProc = fork('./demux.js')
    chainProc.send({
        type: "chainConfig",
        data: chainConfig
    })
    return chainProc
})