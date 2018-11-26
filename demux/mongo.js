const { Mongo } = require("../common/mongo")
const mongo = new Mongo('mongodb://127.0.0.1:27017', 'priveos')
module.exports = mongo