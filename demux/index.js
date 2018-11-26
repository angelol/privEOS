/*
 * To tie everything together, we must instantiate our Action Handler and Action Reader, and instantiate an Action
 * Watcher with both of those.
 */

const { BaseActionWatcher } = require("demux")
const { NodeosActionReader } = require("demux-eos") // eslint-disable-line
const ObjectActionHandler = require("./ObjectActionHandler")
const handlerVersion = require("./handler")

/*
 * This ObjectActionHandler, which does not change the signature from its parent AbstractActionHandler, takes an array
 * of `HandlerVersion` objects
 */
const actionHandler = new ObjectActionHandler([handlerVersion])


 
actionHandler.get_starting_block()
.then(blockNumber => {
 const actionReader = new NodeosActionReader(
   "http://127.0.0.1:8888",
   blockNumber,
 )
 const actionWatcher = new BaseActionWatcher(
   actionReader,
   actionHandler,
   250,
 )

 actionWatcher.watch()
}) 
 


