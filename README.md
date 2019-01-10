# privEOS

This is the main privEOS repository containing the server-side software that all nodes in the privEOS network must run.

## Server Specs
You need a server with the following hardware specs:

* 4 GB of RAM
* 20 GB of Storage
* Bare metal or Cloud Server is both fine

These specs are valid for the testnet and might be increased over time as usage increases or as new functionality is introduced.

## Setting up a PrivEOS Node

Please use the [automated node setup](https://github.com/rawrat/priveos-automation). It's the recommended way to set up privEOS nodes as it's easy and fast and creates a deterministic and reproducible setup.

If you don't want to use the automated setup, you can also [install a node manually](https://github.com/rawrat/privEOS/blob/master/Manual_Node_Setup.md).


## Registering your Node
Once your node is all set up, you can call ```priveosrules:regnode```, it's the privEOS equivalent of ```eosio:regproduce``` 🙂

Example command:

    cleos -u https://jungle2.cryptolions.io  push action priveosrules regnode '["YOUR_EOS_ACCOUNT", "YOUR_NODE_PUBLIC_KEY", "https://YOUR_SERVER_NAME"]' -p YOUR_EOS_ACCOUNT
    
The privEOS contract has a consensus mechanism to set the fees charged for the usage of privEOS. In order to check the current prices:

    # This is the price for storing files on privEOS:
    cleos -u https://jungle2.cryptolions.io get table priveosrules priveosrules storeprice
    
    # This is the price for reading from privEOS:
    cleos -u https://jungle2.cryptolions.io get table priveosrules priveosrules readprice

In order to set your price:
    
    cleos -u https://jungle2.cryptolions.io push action priveosrules setprice '["YOUR_EOS_ACCOUNT", "0.0000 EOS", "store"]' -p YOUR_EOS_ACCOUNT
    cleos -u https://jungle2.cryptolions.io push action priveosrules setprice '["YOUR_EOS_ACCOUNT", "0.0100 EOS", "accessgrant"]' -p YOUR_EOS_ACCOUNT

The price charged for reading and writing to privEOS will be the median of all prices set by the BPs. At the moment, these fees will be collected on a separate account ```priveosxfees```.

## Checking your Node Health
Once you've completed the ```regnode``` step above, your node should appear on the [privEOS monitor](https://monitor.priveos.io/). 

## Testing
For testing, you can use the [privEOS client library](https://github.com/rawrat/priveos-client)

