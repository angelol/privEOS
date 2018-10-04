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


`eosContractsDir` The path to the contracts folder within the eos blockchain code repository.

`eosNodeosDataDir` The path to the nodeos data directory. On mac its: `/Users/<USER>/Library/Application Support/eosio/nodeos/data`.

> Use absolute path without home directory substitution, otherwise the eos_flush make command wont work.

`eosAccountName` The account name of the user for the eos blockchain.


## Initialize Blockchain

To generate the keys for eos, run:

```
make eos_init
```

## Start Local Development Cluster

To start all processes for local development run:

```
npm run start_cluster
```