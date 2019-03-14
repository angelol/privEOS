/*
 * To tie everything together, we must instantiate our Action Handler and Action Reader, and instantiate an Action
 * Watcher with both of those.
 */
 var config
 try {
   config = require("../common/config.js")  
 } catch(e) {
   console.log("config.js not found. Please copy config.js-example to config.js and modify to your needs.")
   console.log(e)
   process.exit(1)
 }
const { BaseActionWatcher } = require("demux")
const { NodeosActionReader } = require("demux-eos") // eslint-disable-line
const ObjectActionHandler = require("./ObjectActionHandler")
const handler = require("./handler")
const Mongo = require("../common/mongo")
let mongo = null
let demux = null
const log = require('../common/log')


process.on('message', msg => {
  console.log('Demux Message from parent:', typeof msg, msg);
  if (!msg.type) return log.error("Received unknown message in demux child process", msg)
  if (msg.type === "chainConfig") {
    demux = new Demux(msg.data)
  }
});

process.on('unhandledRejection', (reason, p) => {
  log.error('Unhandled Rejection at:', p, 'reason:', reason)
  process.exit(1)
})


class Demux {
  constructor(chainConfig) {
    /*
    * This ObjectActionHandler, which does not change the signature from its parent AbstractActionHandler, takes an array
    * of `HandlerVersion` objects
    */
    this.mongo = new Mongo(config.mongoUrl, chainConfig.dbName)
    const WrappedObjectActionHandler = ObjectActionHandler(this.mongo)
    this.actionHandler = new WrappedObjectActionHandler([handler(this.mongo)])
    this.last_block_number = null
    this.start()
  }

  async start() {
    log.debug("Start Demux Child Process")
    await this.setup_mongodb()
    await this.ensure_consistency()
    this.detect_stalling()

    let starting_block = await this.actionHandler.get_current_block()
    if (starting_block != 0) {
      starting_block += 1
    }
    log.info("starting_block: ", starting_block)

    const actionReader = new NodeosActionReader(
      config.httpEndpoint,
      starting_block,
    )
    const actionWatcher = new BaseActionWatcher(
      actionReader,
      this.actionHandler,
      500,
    )

    if(process.send) {
      process.send('ready')    
    }
    actionWatcher.watch()
  }

  /**
    * When demux crashes or is shut down, the last block that was being indexed 
    * will only have been partially complete. So we roll back the last block
    * and re-index from there. That way, we can be sure to have a complete mirror
    * of the blockchain.
    */
  async ensure_consistency() {
    const current_block = await this.actionHandler.get_current_block()
    if(current_block == 0) {
      return
    }
    await this.actionHandler.rollbackTo(current_block - 1)
    await this.actionHandler.updateIndexState(1, {
      blockInfo: {
        blockNumber: current_block - 1,
        blockHash: "",
      }
    }, false, 'v1')
  }

  async setup_mongodb() {
    // createIndex does nothing if index already exists, so it's safe to call this at every start
    const db = await this.mongo.db()
    await db.collection('store').createIndex({"blockNumber": 1})
    await db.collection('accessgrant').createIndex({"blockNumber": 1})
    
    await db.collection('store').createIndex({"data.file": 1})
    await db.collection('accessgrant').createIndex({"data.file": 1})
    await db.collection('data').createIndex({"hash": 1})
    
    const collections = await db.listCollections().toArray()
    const collection_names = collections.map(x => x.name)
    if(!collection_names.includes('state_history')) {
      log.info("Creating state_history capped collection")
      await db.createCollection("state_history", {"capped": true, "size": 1*1024*1024})
    }
  }

  async detect_stalling() {
    const self = this
    const db = await this.mongo.db()  
    const index = await db.collection('index_state').findOne()
    if(index) {
      const current_block_number = index.blockNumber
      if(this.last_block_number == current_block_number) {
        log.error(`Demux has stalled at block ${this.last_block_number}. Exiting.`)
        process.exit(1)
      }
      this.last_block_number = current_block_number
    }

    setTimeout(() => {
      self.detect_stalling.apply(self, []) // need to apply context, otherwise some context is lost...
    }, 5000)
  }

}


module.exports = Demux