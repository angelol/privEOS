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

/*
 * This ObjectActionHandler, which does not change the signature from its parent AbstractActionHandler, takes an array
 * of `HandlerVersion` objects
 */
const actionHandler = new ObjectActionHandler([handlerVersion])


 
actionHandler.get_starting_block()
.then(blockNumber => {
 const actionReader = new NodeosActionReader(
   config.httpEndpoint,
   blockNumber,
 )
 const actionWatcher = new BaseActionWatcher(
   actionReader,
   actionHandler,
   config.pollInterval,
 )

 actionWatcher.watch()
}) 
 


