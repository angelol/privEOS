const config = require('./config')

var db_module

if(config.backend == 'demux') {
  db_module = require('./backends/demux')
}
else if(config.backend == 'mongodb_plugin') {
  throw 'mongodb_plugin is currently unsupported, please use demux'
  db_module =  require('./backends/mongodb_plugin')
} else {
  throw 'Please select a valid database backend'
}

module.exports = db_module