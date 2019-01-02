const { Mongo } = require("../common/mongo")
const config = require("./config.js")

const mongo = new Mongo(config.mongoUrl, config.dbName)

module.exports = mongo
