const { Mongo } = require("../common/mongo")
export const mongo = new Mongo('mongodb://127.0.0.1:27017', 'priveos')
