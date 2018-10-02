create mongodb index:

mongo
use EOS
db.action_traces.createIndex({"act.data.file": 1})



mongodb-uri = mongodb://127.0.0.1:27017/EOS

# Enables storing blocks in mongodb. (eosio::mongo_db_plugin)
mongodb-store-blocks = 0

# Enables storing block state in mongodb. (eosio::mongo_db_plugin)
mongodb-store-block-states = 0

# Enables storing transactions in mongodb. (eosio::mongo_db_plugin)
mongodb-store-transactions = 0

# Enables storing transaction traces in mongodb. (eosio::mongo_db_plugin)
mongodb-store-transaction-traces = 0

# Enables storing action traces in mongodb. (eosio::mongo_db_plugin)
mongodb-store-action-traces = 1

# Mongodb: Track actions which match receiver:action:actor. Actor may be blank to include all. Receiver and Action may not be blank. Default is * include everything. (eosio::mongo_db_plugin)
# mongodb-filter-on = 
