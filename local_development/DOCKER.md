# Docker

The docker workflow is designed to be fully compatible with the native workflow. Please read [https://developers.eos.io/eosio-nodeos/docs/docker-quickstart](https://developers.eos.io/eosio-nodeos/docs/docker-quickstart) in advance. 


## Prepare Config File

You need to extend the `priveos/config.conf` file in order to work with docker. Therefore create a `priveos/config-local.conf` file and add the following line:

```
EOS_CONTRACTS_DIR=/eos/build/contract
```
