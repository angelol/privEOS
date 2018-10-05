#!/bin/sh

if [ $# -eq 0 ]
  then
    echo "Missing required first argument pointing to host volume for docker..."
    exit 1
fi

docker run --name nodeos -d -p 8888:8888 --network eosdev -v ${1}/work:/work -v ${1}/data:/mnt/dev/data -v ${1}/config:/mnt/dev/config -v ${1}/build/:/eos/build eosio/eos-dev  /bin/bash -c "nodeos -e -p eosio --plugin eosio::producer_plugin --plugin eosio::history_plugin --plugin eosio::chain_api_plugin --plugin eosio::history_api_plugin --plugin eosio::http_plugin -d /mnt/dev/data --config-dir /mnt/dev/config --http-server-address=0.0.0.0:8888 --access-control-allow-origin=* --contracts-console --http-validate-host=false"""
docker run -d --name keosd --network=eosdev -i eosio/eos-dev /bin/bash -c "keosd --http-server-address=0.0.0.0:9876"
