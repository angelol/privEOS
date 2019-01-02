/* ObjectActionHandler
 * This is an example of an AbstractActionHandler implementation.
 *
 * The role of the Action Handler is to receive block data passed from the Action Reader, and populate some external
 * state deterministically derived from that data, as well as trigger side-effects.
 *
 * The AbstractActionHandler has the following abstract methods:
 *
 * handleWithState(handle)
 *   Call the passed-in `handle` function with the object you would like to pass in as `state` to Updaters and Effects.
 *   In this example, we're just using a simple structured Javascript object, but in a real implementation this will
 *   most likely an interface to a database. See the API documentation for more details.
 *
 * updateIndexState(state, block)
 *   Besides some caching optimizations, the state of the progress of indexing is stored outside of Demux itself, and
 *   this method is implemented to store that data. The data needed to be stored is blockNumber, blockHash, isReplay,
 *   and handlerVersionName. the `state` object passed into the `handle` function of the above `handleWithState` is
 *   provided here as a convenience.
 *
 * loadIndexState()
 *   This returns an `IndexState` object containing all the information saved in the above method.
 *
 * rollbackTo(blockNumber)
 *   If indexing potentially reversible blocks, a mechanism for reverting back to a specific block is necessary.
 *   In this example, we keep a history of the entire state at every block, and load it when called.
 */


const assert = require('assert')
const { AbstractActionHandler } = require("demux")
const mongo = require("../common/mongo")

class ObjectActionHandler extends AbstractActionHandler {

  
  async handleWithState(handle) {
    await handle()
  }

  async loadIndexState() {
    try {
      const db = await mongo.db()    
      const x = await db.collection('index_state').findOne()
      if(x) {
        return x
      } else {
        return {
            blockNumber: 0,
            blockHash: "",
            isReplay: false,
            handlerVersionName: "v1",
        }
      }
    } catch(e) {
      console.log(e)
      process.exit(1)
    }
    
  }

  async updateIndexState(stateObj, block, isReplay, handlerVersionName) {
    // console.log("updateIndexState: ", block.blockInfo)
    
    assert.ok(handlerVersionName, "handlerVersionName not set!!!")
    try {
      const db = await mongo.db()
      await db.collection('index_state').replaceOne({}, {
        blockNumber: block.blockInfo.blockNumber,
        blockHash: block.blockInfo.blockHash,
        isReplay: isReplay,
        handlerVersionName: handlerVersionName,
      }, { upsert: true})
    } catch(e) {
      console.log(e)
      process.exit(1)
    }
  }

  async rollbackTo(blockNumber) {
    console.log("rollbackTo ", blockNumber)
    try {
      const db = await mongo.db()
      console.log("Deleteing all txs with block number > ", blockNumber)
      db.collection('accessgrant').deleteMany({"blockNumber": { $gt: blockNumber }})
      db.collection('store').deleteMany({"blockNumber": { $gt: blockNumber }})
    } catch(e) {
      console.log(e)
      process.exit(1)
    }
  }
  
  async get_current_block() {
    try {
      const db = await mongo.db()
      const x = await db.collection('index_state').findOne({})
      if(x) {
        // start where we left off syncing
        return x.blockNumber
      } else {
        // we're running this for the first time, so we're starting at the current block height
        return 0
      }
    } catch(e) {
      console.log(e)
      process.exit(1)
    }
  }
  
}

module.exports = ObjectActionHandler
