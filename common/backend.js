import config from './config'

var db_module

if(config.backend == 'demux') {
  db_module = require('./backends/demux')
}
else if(config.backend == 'mongodb_plugin') {
  db_module =  require('./backends/mongodb_plugin')
} else {
  throw 'Please select a valid database backend'
}

export default db_module