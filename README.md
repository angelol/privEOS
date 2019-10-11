# privEOS

This is the main privEOS repository containing the server-side software that all nodes in the privEOS network must run.

## Server Specs
It is recommended to run two separate servers, one for the privEOS server software and one for IPFS. The reason is that IPFS tends to monopolize server resources and that way it will interfere less with the privEOS server software.

For the privEOS Server Software, you need a server with at least the following hardware specs:

* 4 GB of RAM
* 20 GB of Storage
* Bare metal is strongly suggested for private key security

This server will only store the off-chain index in mongodb that privEOS needs. This index will grow slowly as the number of transations on the privEOS network increases. For quick desaster recovery, it is recommended to backup the mongodb database as resyncing from scratch will take a long time.

For the IPFS server, we recommend at least the following specs:

* 8 GB of RAM
* 20 GB of Storage
* Cloud is fine, but it should have a good ping to the main server

This server stores the IPFS payloads that are referenced by the on-chain privEOS transactions. For quick desaster recovery, it is recommended to backup the IPFS data directory as resyncing from scratch will take a long time.

## Setting up a PrivEOS Node

You can choose between the [automated node setup](https://github.com/rawrat/priveos-automation) using Ansible or the [manual installation instructions](https://github.com/rawrat/privEOS/blob/master/Manual_Node_Setup.md). 

Using the automation setup is a great way to start up quickly. It will help in having a homogenous environment on all nodes. If you need deeper integration into the rest of your infrastructure or just prefer to do it yourself, the manual setup is right for you.

## Firewall Configuration
The privEOS software itself only listens on localhost, so there is no danger that services could inadvertently be exposed to the outside. Other services like MongoDB are configured to only listen on localhost as well by default. 

If you are using a firewall, please make sure that it allows stateful connections from the server to the outside. 

For the main privEOS Server, you need to open these ports: 
* `22` or your custom OpenSSH port if you use non-standard port
* `80` We are running an SSL-only service, however the Let's Encrypt cronjob which automatically renews the certificate needs this port.
* `443` This is the standard SSL port that Nginx is listening on.

On the IPFS server:
* `22` or your custom OpenSSH port if you use non-standard port
* `4001` This is the port used by the IPFS Swarm protocol. 
* `5001` For the IPFS HTTP API.  
    
## Registering your Node
Once your node is all set up, you can call ```priveosrules:regnode```, it's the privEOS equivalent of ```eosio:regproduce``` 🙂

To prevent spam, the action charges a fee of 10 EOS or 400 TLOS on Telos that you need to deposit before you can register. This fee will be paid into the regular rewards pool.

Example command:

    cleos -u https://jungle2.cryptolions.io  push action priveosrules prepare '["YOUR_EOS_ACCOUNT", "4,EOS"]' -p YOUR_EOS_ACCOUNT
    cleos -u https://jungle2.cryptolions.io transfer YOUR_EOS_ACCOUNT priveosrules "10.0000 EOS" "Registration fee"
    cleos -u https://jungle2.cryptolions.io  push action priveosrules regnode '["YOUR_EOS_ACCOUNT", "YOUR_NODE_PUBLIC_KEY", "https://YOUR_SERVER_NAME"]' -p YOUR_EOS_ACCOUNT
    
The privEOS contract has a consensus mechanism to set the fees charged for the usage of privEOS. In order to check the current prices:

    # This is the price for storing files on privEOS:
    cleos -u https://jungle2.cryptolions.io get table priveosrules priveosrules storeprice
    
    # This is the price for reading from privEOS:
    cleos -u https://jungle2.cryptolions.io get table priveosrules priveosrules readprice

In order to set your price:
    
    cleos -u https://jungle2.cryptolions.io push action priveosrules setprice '["YOUR_EOS_ACCOUNT", "0.0000 EOS", "store"]' -p YOUR_EOS_ACCOUNT
    cleos -u https://jungle2.cryptolions.io push action priveosrules setprice '["YOUR_EOS_ACCOUNT", "0.0100 EOS", "accessgrant"]' -p YOUR_EOS_ACCOUNT

The price charged for reading and writing to privEOS will be the median of all prices set by the BPs.

This process needs to be repeated for every chain that you would like to connect to.

## Posting your bond (optional)

This step is optional but recommended. If you post a bond, it gives a signal to dApps that you are being serious. As dApps will need to select which nodes they are going to be using to store their files, they will be more likely to select nodes that have the full bond posted. The more dApps vote for your node and the more transactions these dApps make, the more money you earn. For more information on how the bond works and why it is necessary, please see our article on [privEOS tokenomics](https://steemit.com/priveos/@slant/priveos-tokenomics).

The bond amount is 1,000.0000 EOS for the EOS mainnet and 40,000.0000 TLOS for the Telos mainnet.

The bond will have to be transferred in from you main account that you're using to `regnode`. If your funds are currently in a different account, you're gonna have to transfer them to your main account first and deposit them from there like this:

    cleos -u https://jungle2.cryptolions.io  push action priveosrules prepare '["YOUR_EOS_ACCOUNT", "4,EOS"]' -p YOUR_EOS_ACCOUNT
    cleos -u https://jungle2.cryptolions.io transfer YOUR_EOS_ACCOUNT priveosrules "1000.0000 EOS" "Bond, James Bond"
    cleos -u https://jungle2.cryptolions.io  push action priveosrules postbond '["YOUR_EOS_ACCOUNT", "1000.0000 EOS"]' -p YOUR_EOS_ACCOUNT

## Checking your Node Health
Once you've completed the ```regnode``` step above, your node should appear on the [privEOS monitor](https://monitor.priveos.io/). 

## Demux Syncing
Demux syncing works best with node that's in close network proximity. If you have problems keeping your demux index in sync with the tip of the chain, make sure you are using an API endpoint that is close to your server. We've observed problems when the ping to the API endpoint is greater than 100ms. So if you're in the UK and using an API Endpoint in Germany, you're probably okay, but not if you use one from Australia.

Demux is the easiest to set up because you can use any public API endpoint, but it has a few drawbacks. Currently, it does not support inline actions. PrivEOS also supports other backends such as the eosio::mongodb_plugin for nodeos. If you would like to test privEOS with mongodb_plugin, let us know on [Telegram](https://t.me/SLANT_official).

## Testing
For testing, you can use the [privEOS client library](https://github.com/rawrat/priveos-client)

