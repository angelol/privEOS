# privEOS

This is the main privEOS repository containing the server-side software that all nodes in the privEOS network must run.

## Setting up a PrivEOS Node
Please use the [automated node setup](https://github.com/rawrat/priveos-automation). It's the recommended way to set up privEOS nodes as it's easy and fast and creates a deterministic and reproducible setup.

If you don't want to use the automated setup, you can also [install a node manually](https://github.com/rawrat/privEOS/blob/master/Manual_Node_Setup.md).


## Registering your Node
Once your node is all set up, you can call ```priveosrules:regnode```, it's the privEOS equivalent of ```eosio:regproduce``` 🙂

Example command:

    cleos -u https://jungle2.cryptolions.io  push action priveosrules regnode '["YOUR_EOS_ACCOUNT", "YOUR_NODE_PUBLIC_KEY", "https://YOUR_SERVER_NAME"]' -p YOUR_EOS_ACCOUNT
    
    