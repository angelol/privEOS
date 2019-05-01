'use strict'
const axios = require('axios')
axios.defaults.timeout = 5000
const Promise = require('bluebird')
const log = require('../common/log')
const { URL } = require('url')
const config = require('../common/config')
const Eos = require('eosjs')
const eosjs_ecc = require('eosjs-ecc-priveos')
const assert = require('assert')

class Watchdog {
  constructor(chain) {
    this.chain = chain.config
    this.eos = chain.eos
    this.approvals = []
    this.disapprovals = []
    this.status = 'ok'
  }
  
  async run() {
    while(true) {
      const watchdog_should_run = await this.should_watchdog_run()
      if(!watchdog_should_run) {
        log.info("Contract version is incompatible, skipping this round.")
        await Promise.delay(10000)
        continue
      }
      
      // 1. get nodes
      const nodes = await this.get_nodes()
      this.approvals = await this.get_approvals()
      this.disapprovals = await this.get_disapprovals()
      log.debug(`${this.chain.chainId} approvals: ${JSON.stringify(this.approvals)}`)
      log.debug(`${this.chain.chainId} disapprovals: ${JSON.stringify(this.disapprovals)}`)
      
      for(const node of nodes) {
        try {
          await this.handle_node(node)
          this.status = 'ok'
        } catch(e) {
          log.error(e)
          if(this.status == 'ok') {
            this.status = 'error while checking node'
          } 
        }
        await Promise.delay(2000)
      }
    }
  }
  
  async should_watchdog_run() {
    const res = await this.eos.getAbi({account_name: this.chain.contract})
    const table_names = res.abi.tables.map(x => x.name)
    // console.log(JSON.stringify(table_names, null, 2))
    return table_names.includes('peerapproval')
  }
  
  async get_nodes() {
    const res = await this.eos.getTableRows({json:true, scope: this.chain.contract, code: this.chain.contract,  table: 'nodes', limit:100})
    return res.rows.filter(x => x.owner != this.chain.nodeAccount)
  }
  
  async handle_node(node) {
    const node_is_okay = await this.is_node_okay(node)
    log.debug(`${this.chain.chainId} Node ${node.owner} is ${node_is_okay}`)
    if(node_is_okay && !node.is_active) {
      log.info(`${this.chain.chainId} Node ${node.owner} is okay, approving`)
      return this.approve(node)
    }
    if(!node_is_okay && node.is_active) {
      log.info(`${this.chain.chainId} Node ${node.owner} is down, disapproving`)
      return this.disapprove(node)
    }
  }
  
  async get_approvals() {
    const res = await this.eos.getTableRows({json:true, scope: this.chain.contract, code: this.chain.contract,  table: 'peerapproval', limit:100})
    return res.rows.reduce((a, b) => {
      if(!this.is_expired(b)) {
        a[b.node] = b.approved_by
      }
      return a
    }, {})
  }

  async get_disapprovals() {
    const res = await this.eos.getTableRows({json:true, scope: this.chain.contract, code: this.chain.contract,  table: 'peerdisappr', limit:100})
    log.debug(`${this.chain.chainId} get_disapprovals: ${JSON.stringify(res.rows,null, 2)}`)
    return res.rows.reduce((a, b) => {
      if(!this.is_expired(b)) {
        a[b.node] = b.disapproved_by
      }
      return a
    }, {})
  }
  
  
  async approve(node) {
    if(this.needs_my_approval(node)) {
      log.debug(`${this.chain.chainId} Node ${node.owner} needs my approval`)
      return this.execute_transaction(node, 'peerappr')
    } else {
      log.debug(`${this.chain.chainId} Node ${node.owner} already approved by me`)
    }
  }

  async disapprove(node) {
    if(this.needs_my_disapproval(node)) {
      log.debug(`${this.chain.chainId} Node ${node.owner} needs my disapproval`)
      return this.execute_transaction(node, 'peerdisappr')
    } else {
      log.debug(`${this.chain.chainId} Node ${node.owner} already disapproved by me`)
    }
  }
  
  needs_my_approval(node) {
    const approval = this.approvals[node.owner]
    log.debug(`${this.chain.chainId} needs_my_approval: approval: ${approval}`)
    if(!approval) {
      log.debug("OHAI needs_my_approval: no approval found, returning true")
      return true
    }
    // Only approve if we haven't already approved this request
    log.debug("OHAI needs_my_approval: this.chain.nodeAccount: ", this.chain.nodeAccount)
    log.debug("approval: ", approval)
    return !approval.includes(this.chain.nodeAccount)
  }

  needs_my_disapproval(node) {
    const disapproval = this.disapprovals[node.owner]
    log.debug(`${this.chain.chainId} Node ${node.owner} disapproval: ${disapproval}`)
    if(!disapproval) {
      return true
    }
    // Only disapprove if we haven't already disapproved this request
    return !disapproval.includes(this.chain.nodeAccount)  
  }
  
  is_expired(approval) {
    return ((new Date()).getTime()/1000 - approval.created_at) > 5*60 
  }
  
  async execute_transaction(node, action_name) {
    const actions = [{
      account: this.chain.contract,
      name: action_name,
      authorization: [{
        actor: this.chain.nodeAccount,
        permission: this.chain.watchdogPermission.permission,
      }],
      data: {
        sender: this.chain.nodeAccount,
        owner: node.owner,
      }
    }]
    try { 
      log.debug("Executing tx: ", JSON.stringify(actions, null, 2))
      const res = await this.eos.transaction({actions})
      log.debug("EOS returned: ", res)
      this.status = 'ok'
      return res
    } catch(e) {
      log.error(`${this.chain.chainId} Error while executing transaction: ${e}`)
      this.status = "error while executing transaction"
      throw e
    }
  }
  
  async is_node_okay(node) {
    const url = new URL('/broker/status/', node.url)
    log.debug(`${this.chain.chainId} Trying ${url.href}`)
    let okay = false
    try {
      const res = await axios.get(url.href)
      const all_chains = res.data['chains']
      const this_chain = all_chains.find(x => x.chainId === this.chain.chainId)
      if(this_chain && this_chain.status === 'ok') {
        okay = true
      }
    } catch(e) {
      okay = false
    }
    return okay
  }
  
}

module.exports = Watchdog
