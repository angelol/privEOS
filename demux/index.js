/*
 * To tie everything together, we must instantiate our Action Handler and Action Reader, and instantiate an Action
 * Watcher with both of those.
 */
 var config
 try {
   config = require("./config.js")  
 } catch(e) {
   console.log("config.js not found. Please copy config.js-example to config.js and modify to your needs.")
   process.exit(1)
 }
const { BaseActionWatcher } = require("demux")
const { NodeosActionReader } = require("demux-eos") // eslint-disable-line
const ObjectActionHandler = require("./ObjectActionHandler")
const handlerVersion = require("./handler")
const { mongo } = require("./mongo")

/*
 * This ObjectActionHandler, which does not change the signature from its parent AbstractActionHandler, takes an array
 * of `HandlerVersion` objects
 */
const actionHandler = new ObjectActionHandler([handlerVersion])


async function start() { 
  await create_indexes()
  await ensure_consistency()
  
  let starting_block = await actionHandler.get_current_block()
  if(starting_block != 0) {
    starting_block += 1
  }
  console.log("starting_block: ", starting_block)
  const actionReader = new NodeosActionReader(
    config.httpEndpoint,
    starting_block,
  )
  const actionWatcher = new BaseActionWatcher(
    actionReader,
    actionHandler,
    config.pollInterval,
  )

  actionWatcher.watch()
}
start()

/**
  * When demux crashes or is shut down, the last block that was being indexed 
  * will only have been partially complete. So we roll back the last block
  * and re-index from there. That way, we can be sure to have a complete mirror
  * of the blockchain.
  */
async function ensure_consistency() {
  const current_block = await actionHandler.get_current_block()
  if(current_block == 0) {
    return
  }
  actionHandler.rollbackTo(current_block - 1)
  actionHandler.updateIndexState(null, {
    blockInfo: {
      blockNumber: current_block - 1,
      blockHash: "",
    }
  }, false, 'v1')
}

async function create_indexes() {
  // createIndex does nothing if index already exists, so it's safe to call this at every start
  const db = await mongo.db()
  await db.collection('store').createIndex({"blockNumber": 1})
  await db.collection('accessgrant').createIndex({"blockNumber": 1})
  
  await db.collection('store').createIndex({"data.file": 1})
  await db.collection('accessgrant').createIndex({"data.file": 1})
  await db.collection('data').createIndex({"hash": 1})

}


