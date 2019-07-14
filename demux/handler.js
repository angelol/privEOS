/* Updaters
 * When the Action Handler receives new blocks, for each action in that block, we loop over all updaters and check if
 * the actionType matches. If it does, we run the corresponding updater's `apply` function. The order of the updaters
 * is significant, and each `apply` function is run synchronously in order to maintain determinism.
 *
 * All updater functions have the following parameters:
 *   - `state`:     This is the API provided by the ActionHandler to accumulate state. In this example, it's a simple
 *                  javascript object.
 *
 *   - `payload`:   This object contains all relevant information associated with the current action. Its contents
 *                  are completely determined by the ActionReader implementation. Since we're using demux-eos in this
 *                  example, you can see the `EosPayload` type here:
 *                  https://github.com/EOSIO/demux-js-eos/blob/develop/src/interfaces.ts
 *
 *   - `blockInfo`: Object containing information about the current block. See `BlockInfo` type here:
 *                  https://github.com/EOSIO/demux-js/blob/develop/src/interfaces.ts
 *
 *   - `context`:   This object's purpose is to provide access to temporary data between different Updaters' `apply`
 *                  (and Effects' `run`) functions of the same block. A new `context` object is created by the
 *                  ActionHandler every block. It may be pre-loaded with information by the ActionHandler, and/or may
 *                  be modified by `apply` functions themselves. This is separate from `state` because not all relevant
 *                  data may need to be permanently stored. In this way, it can be used as a fast cache (instead of
 *                  writing/reading/deleting temporary data using `state`), and is also useful for passing accumulated
 *                  or processed data to the Effects' `run` functions in a way that is safe from race conditions.
 *
 * In this example, we're watching the "eosio.token::transfer" action type and accumulating a running total using the
 * provided `state` object. Refer to the ObjectActionHandler implementation for `state`:
 * https://github.com/EOSIO/demux-js/blob/develop/examples/eos-transfers/ObjectActionHandler.js
*/
const config = require("../common/config.js")
const ipfsClient = require('ipfs-http-client')
const assert = require('assert')
global.Promise = require('bluebird')
const log = require('../common/log')

module.exports = mongo => {

  async function insertStore(state, payload, blockInfo, context) {
    log.debug("insertStore: payload.data: ", payload.data)
    const doc = Object.assign(payload, blockInfo)
    try {
      const db = await mongo.db()
      db.collection('store').insertOne(doc)

      /**
        * The store transaction in the blockchain only contains a multihash
        * of the privEOS data. Use this hash to retrieve the full data from
        * the temporary database and store it in IPFS.
        *
        * As is common practice, we are using IPFS to not unnecessarily 
        * bloat the on-chain transactions with binary data. 
        */
      const hash = payload.data.data
      const res = await db.collection('data').findOne({hash})
      if(!res || !res.data) {
        log.info(`Hash ${hash} not in local database, ignoring`)
        return
      }
      log.debug("full data retrieved from db: ", res.data)
      
      const ipfs = ipfsClient(config.ipfsConfig.host, config.ipfsConfig.port, {'protocol': config.ipfsConfig.protocol})
      const buffer = Buffer.from(res.data)
      const results = await ipfs.add(buffer).timeout(1000, "Timeout while ipfs.add")
      const ipfs_hash = results[0].hash
      log.debug("ipfs_hash: ", ipfs_hash)
      assert.equal(hash, ipfs_hash, "Hashes differ, this should not be possible")      
    } catch(e) {
      log.error(e)
      process.exit(1)
    }
  }

  async function insertAccessgrant(state, payload, blockInfo, context) {
    log.debug("insertAccessgrant: payload.data: ", payload.data)
    const doc = Object.assign(payload, blockInfo)
    try {
      const db = await mongo.db()
      db.collection('accessgrant').insertOne(doc)
    } catch(e) {
      log.error(e)
      process.exit(1)
    }
  }

  const updaters = [
    {
      actionType: "priveosrules::store",
      apply: insertStore,
    },
    {
      actionType: "priveosrules::accessgrant",
      apply: insertAccessgrant,
    },
  ]
  
  /* Effects
  * Effect `run` functions are much like Updater `apply` functions, with the following differences:
  *   - `state` is not provided
  *   - functions are non-blocking, run asyncronously
  * These functions are not provided `state` because providing a way to access state outside of updaters would make them
  * non-deterministic. The purpose of Effect `run` functions is side-effects, which affect state out of the bounds of the
  * control of the `state` object.
  *
  * In this example, we're utilizing it very simply to output the current running token transfer totals to the console.
  */
  
  function exampleEffect(payload, blockInfo, context) {
    // console.info("State updated:\n", JSON.stringify(context.stateCopy, null, 2))
  }
  
  const effects = [
  ]
  
  
  /*
  * Handler Versions
  * In actual applications, there may be a need to change Updater and Effects in tandem with blockchain actions (such as
  * updating a contract). Demux gives you this ability by segmenting named sets of Updaters and Effects through an
  * interface called `HandlerVersion`. By default, the first Handler Version used will be whichever one has the name
  * "v1". To change Handler Versions with an Updater, simply return the name of the Handler Version from the Updater's
  * `apply` function, and if a Handler Version exists with that name, the Updaters and Effects of that version will be
  * used from that point forward.
  *
  * Since this is a simple example, we will only be using a single Handler Version, "v1".
  */
  
  return {
    versionName: "v1",
    updaters,
    effects,
  }
  
}
