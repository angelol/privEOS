# Development Setup

## Prerequisites

Install required global node modules:

```
npm install -g pm2
```

Install following cli utils:

1. jq [https://stedolan.github.io/jq/download/](https://stedolan.github.io/jq/download/)

## Config File

Please copy the config file in project root called `config-template.json` and name it `config.json`. Then replace all the properties in that file to match your local criteria:

`cleosExecutable` The path to the cleos executable. For the docker version, see [https://developers.eos.io/eosio-nodeos/docs/docker-quickstart#section-step-5-alias-cleos](https://developers.eos.io/eosio-nodeos/docs/docker-quickstart#section-step-5-alias-cleos) or use `docker exec -it nodeos /opt/eosio/bin/cleos --url http://127.0.0.1:8888 --wallet-url http://172.18.0.3:9876` and adapt your ip's.

`eosiocppExecutable` The path to the eosiocpp tool. For docker, use `docker exec nodeos /opt/eosio/bin/eosiocpp`.

`eosContractsDir` The path to the contracts folder within the eos blockchain code repository or docker container. For the docker version, simply use `/eos/contracts/` as the contracts are inside the docker container.

`eosNodeosDataDir` The path to the nodeos data directory. On mac its: `/Users/<USER>/Library/Application Support/eosio/nodeos/data`. For the docker version, use `/tmp/eosio/data`.

> Use absolute path without home directory substitution, otherwise the eos_flush make command wont work.

`eosAccountName` The account name of the user for the eos blockchain.

> When using Docker... please read this: [https://developers.eos.io/eosio-nodeos/docs/docker-quickstart](https://developers.eos.io/eosio-nodeos/docs/docker-quickstart)

## Start Blockchain

First, start your eos blockchain either with docker or natively:

```
make start_eos_docker
```

or

```
make start_eos_native
```

## Initialize Blockchain

To generate the keys for eos, run:

```
make eos_init
```

## Reset Blockchain

To reset the blockchain (flush accounts etc..) run:

```
make eos_flush
```

## Start all services

To start all processes for local development run:

```
make start_services
```