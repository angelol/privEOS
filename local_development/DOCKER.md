# Docker

The docker workflow is designed to be fully compatible with the native workflow. Please read [https://developers.eos.io/eosio-nodeos/docs/docker-quickstart](https://developers.eos.io/eosio-nodeos/docs/docker-quickstart) in advance. 

## Start Docker Containers

```
bin/start-eos-docker.sh
```

## Start interactive Docker Shell

```
bin/start-docker-shell.sh
```

## Initial Setup of eos Docker container

To use the system contracts of eos, you need to compile them first as the docker container is shipped with a minimal version only. Therefore, open an `interactive docker shell` and type:

```
/eos/eosio_build.sh -s EOS
```

The build script will then compile the system smart contracts, which can then be found under `/eos/build/contracts`.

## Prepare Config File

You need to extend the `priveos/config.conf` file in order to work with docker. Therefore create a `priveos/config-local.conf` file and add the following line:

```
EOS_CONTRACTS_DIR=/eos/build/contract
```

## Initial Setup

To initially setup the `EOS` docker container, run the following command inside an `interactive docker shell`:

```
cd /priveos
make init
```