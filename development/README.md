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

@TODO: add all other props

## Initialize Blockchain

To generate the keys for eos, run:

```
make init
```

## Start Local Development Cluster

To start all processes for local development run:

```
npm run start_cluster
```