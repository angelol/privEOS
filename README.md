# privEOS

This is the main privEOS repository containing the server-side software that all nodes in the privEOS network must run.

## Server Specs
You need a server with the following hardware specs:

* 4 GB of RAM
* 20 GB of Storage
* Bare metal or Cloud Server is both fine

These specs are valid for the testnet and might be increased over time as usage increases or as new functionality is introduced.

## Setting up a PrivEOS Node

You can choose between the [automated node setup](https://github.com/rawrat/priveos-automation) using Ansible or the [manual installation instructions](https://github.com/rawrat/privEOS/blob/master/Manual_Node_Setup.md). 

Using the automation setup is a great way to start up quickly. It will help in having a homogenous environment on all nodes. If you need deeper integration into the rest of your infrastructure or just prefer to do it yourself, the manual setup is right for you.

## Firewall Configuration
The privEOS software itself only listens on localhost, so there is no danger that services could inadvertently be exposed to the outside. Other services like MongoDB are configured to only listen on localhost as well by default. 

If you are using a firewall, please make sure that it allows stateful connections from the server to the outside. Additionally, the following ports need to be reachable from the outside:
* `22` or your custom OpenSSH port if you use non-standard port
* `80` We are running an SSL-only service, however the Let's Encrypt cronjob which automatically renews the certificate needs this port.
* `443` This is the standard SSL port that Nginx is listening on.
* `4001` We recommend opening this up for IPFS so other Swarm nodes can connect to us. This also makes our setup future-proof as there are ideas to build a private IPFS subnet consisting of privEOS nodes.

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

