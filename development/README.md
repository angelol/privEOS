# Development Setup

The Development Setup makes it easy to orchestrate the different services. For management of processes we use `pm2`. 

## Prerequisites

### EOS Installation

You need to have a working eos installation ready, either natively on your host machine (built manually) or with a docker container. When using the docker container, make sure, that you have the contracts folder build:

```
# within the docker container
cd /eos
./eosio_build.sh
cd build
sudo make system
```

When using docker, please carefully read: [https://developers.eos.io/eosio-nodeos/docs/docker-quickstart](https://developers.eos.io/eosio-nodeos/docs/docker-quickstart)

### Global Node Modules

You need the following node modules in order to work properly. To install run:

```
npm install -g pm2
```

### CLI Utils

1. jq [https://stedolan.github.io/jq/download/](https://stedolan.github.io/jq/download/)

## Config File

The config file stores relevant information related to the development environment. It will be filled during the setup process with additional informations.

Please copy the config file `development/config-template.json` to `development/config.json`. and replace all the properties in that file to match your local criteria:

- `cleosExecutable` The path to the cleos executable.
    
   For __docker__, please read through [https://developers.eos.io/eosio-nodeos/docs/docker-quickstart#section-step-5-alias-cleos](https://developers.eos.io/eosio-nodeos/docs/docker-quickstart#section-step-5-alias-cleos) or use `docker exec -it nodeos /opt/eosio/bin/cleos --url http://127.0.0.1:8888 --wallet-url http://[keosd_ip]:9876` and adapt your ip's.


- `eosiocppExecutable` The path to the eosiocpp tool.

    For __docker__, us `docker exec nodeos /opt/eosio/bin/eosiocpp`.

- `eosContractsDir` The path to the contracts folder within the eos blockchain code repository or docker container.

    For __Docker__, simply use `/contracts/` as the contracts are inside the docker container. If this folder is empty, you need to rebuild the system (see _EOS Installation_ chapter above)

- `eosNodeosDataDir` The path to the nodeos data directory.

    On __Apple Mac__ its: `/Users/<USER>/Library/Application Support/eosio/nodeos/data`. Please note, that you should use absolute path without home directory substitution, otherwise the eos_flush make command wont work.
    
    For __Docker__, use `/tmp/eosio/data` as this is the mounted volume in the docker run script.

- `eosAccountName` The account name of the user for the eos blockchain.


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

To setup the eos blockchain initially by installing all required contracts and accounts for testing, run:

```
make eos_init
```

## Reset Blockchain

To reset the blockchain (flush accounts etc..) run for docker, run:

```
make eos_docker_flush
```

or natively:

```
make eos_native_flush
```