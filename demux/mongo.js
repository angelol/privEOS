const MongoClient = require('mongodb')
const Promise = require('bluebird')

const mongoUrl = 'mongodb://127.0.0.1:27017'
const dbName = 'priveos'

function getMongoConnection(url) {
 return MongoClient.connect(url, { 
		promiseLibrary: Promise, 
		useNewUrlParser: true,
	})
 .disposer(conn => conn.close())
}

function mongo(fun) {
 return Promise.using(getMongoConnection(mongoUrl), (conn) => {
   return fun(conn.db(dbName))
 })
}

module.exports = mongo