const { Mongo } = require("../common/mongo")
const config = require("./config.js")

export const mongo = new Mongo(config.mongoUrl, config.dbName)
