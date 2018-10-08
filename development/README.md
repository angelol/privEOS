# Development Setup

The Development Setup makes it easy to orchestrate the different services. For management of processes we use `pm2`. 

## Prerequisites

### EOS Installation

You need to have a working eos installation ready, either natively on your host machine (built manually) __or__ with a docker container.

#### Using EOS Docker

When using the docker container, make sure, that you have the contracts folder build:

```
# within the docker container
cd /eos
./eosio_build.sh -s EOS
cd build
sudo make system
```

When using docker, please carefully read: [https://developers.eos.io/eosio-nodeos/docs/docker-quickstart](https://developers.eos.io/eosio-nodeos/docs/docker-quickstart)

### Global Node Modules

You need the following node modules in order to work properly. To install run:

```
npm install -g \
    pm2@3.2.1 \
    babel-cli@^6.26.0 \
    nodemon@^1.18.4 \
    rimraf@^2.6.2
```

### Local Node Modules

To install all local `node_modules` for the respective services, run:

```
bin/install-node-modules.sh
```

> Nodemon may be removed later due to pm2... TBD

### CLI Utils

1. jq [https://stedolan.github.io/jq/download/](https://stedolan.github.io/jq/download/)

### Config File

The config file stores relevant information related to the development environment. It will be filled during the setup process with additional informations.

Please copy the config file `development/config-template.json` to `development/config.json`. and replace all the properties in that file to match your local criteria:

- `cleosExecutable` The path to the cleos executable.
    
   For __Docker__, please read through [https://developers.eos.io/eosio-nodeos/docs/docker-quickstart#section-step-5-alias-cleos](https://developers.eos.io/eosio-nodeos/docs/docker-quickstart#section-step-5-alias-cleos) or use `docker exec -it nodeos /opt/eosio/bin/cleos --url http://127.0.0.1:8888 --wallet-url http://[keosd_ip]:9876` and adapt your ip's.


- `eosiocppExecutable` The path to the eosiocpp tool.

    For __Docker__, us `docker exec nodeos /opt/eosio/bin/eosiocpp`.

- `eosContractsDir` The path to the contracts folder within the eos blockchain code repository or docker container.

    For __Docker__, simply use `/eos/build/contracts/` as the contracts are inside the docker container. If this folder is empty, you need to rebuild the system (see _EOS Installation_ chapter above)

- `eosNodeosDataDir` The path to the nodeos data directory.

    On __Apple Mac__ its: `/Users/<USER>/Library/Application Support/eosio/nodeos/data`. Please note, that you should use absolute path without home directory substitution, otherwise the eos_flush make command wont work.
    
    For __Docker__, use `/tmp/eosio/data` as this is the mounted volume in the docker run script.

- `eosAccountName` The account name of the user for the eos blockchain.

- `priveosContractSrcFolder` The path to the folder of the priveos eos contract source files.

    For __Docker__, use `/priveos` as the priveos source folder is mounted into docker.

    For all other, use `../priveos`.


### Verbosity in EOS

Enable verbose error reporting in `config.ini`:

```
verbose-http-errors = true
contracts-console = true
```

## Start Developing

### EOS Blockchain

#### Start EOS Blockchain

First, start your eos blockchain either with docker or natively:

```
make start_eos_docker
```

or

```
make start_eos_native
```

#### Initialize Blockchain

To setup the eos blockchain initially by installing all required contracts and accounts for testing, run:

```
make eos_init
```

#### Reset Blockchain

To reset the blockchain (flush accounts etc..) run for docker, run the following but keep in mind that you need to rebuild (`eosio_build.sh -s EOS`)!

```
make eos_docker_flush
```

or natively:

```
make eos_native_flush
```

#### Restart Nodeos

To restart nodeos on docker, run:

```
make eos_docker_restart
```

For native:

```
TBD
```

### Node Services

#### Start Services

To start the services `priveos_kms`, `broker` and `client` you can use the `package.json` start scripts in each folder or the pm2 process manager:

```
pm2 start pm2-services.json
```

#### Log to stdout

If you want do directly stream the outputs of each service to the console window, add the `--no-daemon` flag to `pm2`:

```
pm2 start pm2-services.json --no-daemon
```