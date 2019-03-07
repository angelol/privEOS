'use strict'
const config = require('../common/config')
const log = require('../common/log')
const { fork, spawn } = require('child_process')

// check only required for bps to migrate to new config file with multiple chain ids
if(!config.chains) {
  log.warn(`Configuration warning: Please migrate config to support multiple chains - single chain support will be dropped in the future. See https://github.com/rawrat/privEOS/blob/multichain-support/common/config.js-example for example.`)
  config.chains = [
    config
  ]
}

log.info('Start Demux Process Manager')

const processes = config.chains.map(chainConfig => {
    // const chainProc = fork('demux.js', { execArgv: [process.argv[1]] }) // when running --inspect flag we want the children to not fail
    const chainProc = fork('./demux.js')
    chainProc.send({
        type: "chainConfig",
        data: chainConfig
    })
    return chainProc
})