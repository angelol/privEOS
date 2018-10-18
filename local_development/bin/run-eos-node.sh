#!/bin/sh

source config.conf
source config-local.conf


nodeos -e -p eosio --plugin eosio::mongo_db_plugin --plugin eosio::producer_plugin --plugin eosio::chain_api_plugin --plugin eosio::http_plugin -d $NODEOS_MOUNT/data --config-dir $NODEOS_MOUNT/config --http-server-address=127.0.0.1:${EOS_HTTP_PORT} --p2p-listen-endpoint=127.0.0.1:${EOS_P2P_PORT} --access-control-allow-origin=* --delete-all-blocks --mongodb-wipe
