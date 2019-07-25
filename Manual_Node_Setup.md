# Node Setup Guide (Manual Installation)

This guide describes the manual installation. For easier setup and better reproducibility, the [automated setup](https://github.com/rawrat/priveos-automation) using ansible is recommended.

We are assuming Ubuntu 18.04 in this guide. If possible, use the XFS file system for better performance with mongodb. 

### Install Dependencies

Install the Let's Encrypt certbot, so we can use https for everything:

    apt-get update
    apt-get install software-properties-common
    add-apt-repository universe
    add-apt-repository ppa:certbot/certbot
    apt-get update
    apt-get install python-certbot-nginx build-essential
    
Please install node.js 11 by following the instructions here: https://github.com/nodesource/distributions#installation-instructions. Unfortunately, Ubuntu comes with the ancient version 8 and we absolutely need nodejs 11.
    
Install the rest of the dependencies:
    
    apt install git nodejs npm mongodb-server golang nginx ntp
    go get -u github.com/ipfs/ipfs-update
    ~/go/bin/ipfs-update install latest
    npm install pm2@latest -g

Configure IPFS
  
    adduser ipfs --disabled-password --disabled-login
    su - ipfs
    ipfs init --profile server
    logout

Make sure IPFS is automatically started:

    cat << EOF > /etc/systemd/system/ipfs.service
    [Unit]
    Description=IPFS Daemon

    [Service]
    Type=simple
    User=ipfs
    Environment=HOME=/home/ipfs
    Restart=always
    ExecStart=/usr/local/bin/ipfs daemon

    [Install]
    WantedBy=multi-user.target
    EOF
    
    systemctl enable ipfs
    systemctl start ipfs
    
### Install privEOS Services

    adduser priveos --disabled-password
    adduser encryptionservice --disabled-password

    su - priveos
    git clone https://github.com/rawrat/privEOS.git
    cd privEOS
    npm install
    cp common/config.js-example common/config.js
    vi common/config.js
    
When editing the config file, make sure to enter a valid `httpEndpoint` for every chain you want to connect to and a matching `chainId`. Under `nodeAccount`, enter your EOS BP account that you will use to `regnode` with the privEOS contract. `dbName` is the name of the mongodb database that should be used for the off-chain index and needs to be unique. `contract` is the contract where the privEOS smart contract is deployed to (usually `priveosrules`).

Please follow the [instructions to add a watchdog permission](https://github.com/rawrat/privEOS#add-watchdog-permission) and under `watchdogPermission`, enter your the private key of your newly generated `watchdog` permission. You have to repeat that step for every chain.

If you're following this guide, you don't need to touch the rest of the values.

Start service and check log output for potential errors:

    pm2 start live.yml
    pm2 log
    
You can verify that the chain is being indexed by checking mongodb:

    mongo
    use priveos
    db.index_state.find()

You should see output like:
```
{ "_id" : ObjectId("5c2e8953f62fc5fddc6ecaac"), "blockNumber" : 6939003, "blockHash" : "0069e17b1b722b15d0494a65ed6e845e45a4332f8a71d971a8928a80e768a5da", "isReplay" : false, "handlerVersionName" : "v1" }
```
To install pm2 startup script, run

    pm2 save
    pm2 startup
And execute the suggested command in the output as root.

Now let's install the encryption service under a different user.
```
apt install build-essential
adduser encryptionservice --disabled-password
```

This daemon runs with locked memory to prevent secrets from being swapped to disk. This means we need to increase the memlock limits for our new user by:

```
cat << EOF > /etc/security/limits.conf
encryptionservice     soft    memlock         104857600
encryptionservice     hard    memlock         104857600
EOF
```

We can now go on with the installation:
```
su - encryptionservice 
git clone https://github.com/rawrat/priveos-encryption-service.git
cd priveos-encryption-service
npm install
cp config.js-example config.js
```
In the `config.js` please enter your current node public key for every chainId. 

If you're upgrading from an earlier version, we found it necessary to remove the `node_modules` folder and re-running `npm install`. Bloody npm!

Start service and check log output for potential error messages:
```
pm2 start
pm2 log
```
If you're getting the error message `mlockall failed with error -12. Exiting.`, that means the memlock limits in `/etc/security/limits.conf` need to be increase (see above). After changing the values, you may need to logout and log back in as the `encryptionservice` user.

To install pm2 startup script, run
```
pm2 save
pm2 startup
```
And execute the suggested command in the output as root. This command will install the systemd startup script under the following path: `/etc/systemd/system/pm2-encryptionservice.service`. We're gonna have to make a slight change to that startup script:

Please add 

```
LimitMEMLOCK=infinity
```
to the `[Service]` section of the file. So the file should look something like this example:

```
[Unit]
Description=PM2 process manager
Documentation=https://pm2.keymetrics.io/
After=network.target

[Service]
Type=forking
User=encryptionservice
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
LimitMEMLOCK=infinity
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin:/usr/bin:/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin
Environment=PM2_HOME=/home/encryptionservice/.pm2
PIDFile=/home/encryptionservice/.pm2/pm2.pid
Restart=on-failure

ExecStart=/usr/lib/node_modules/pm2/bin/pm2 resurrect
ExecReload=/usr/lib/node_modules/pm2/bin/pm2 reload all
ExecStop=/usr/lib/node_modules/pm2/bin/pm2 kill

[Install]
WantedBy=multi-user.target

```
Please not the line `LimitMEMLOCK=infinity` which we manually added.

Now it would be a good idea to restart the server to verify that the encryption-service will be started automatically.

## What is the node public/private key?
Each privEOS node requires a private key that is independent of any permission with the sole purpose of securely exchanging information with the users. When the user sends information to a node, it's encrypted with that public key (using ECDH), so only the node which is in possession of the respective private key is able to decrypt the data. 

It is vitally important that this private key stays secret. It is in the responsibility of the node operator to make sure this key never gets compromised.

## Usage
The encryption-service consists of a daemon that listens on localhost for commands and a command line tool to perfom common tasks. 

Once the daemon is running, we can start by setting a master passphrase:
```
./wallet setpassphrase
```
Now you can unlock the vault by:
```
./wallet unlock
```
Please note that the vault must be unlocked interactively by providing the secret passphrase every time the daemon is started. Please do NOT be tempted to store the passphrase on the server itself, this would open up a huge security hole! 

The vault is now unlocked and we can now import our private key(s):
```
./wallet import
```

You can check the imported keys by:
```
./wallet list
```
For a full list of commands, please see:
```
./wallet --help
```

Once all the private keys matching the public keys configured in `config.js` are imported, the encryption-service is fully operational.

### Nginx setup
The privEOS services are now running but for security reasons, they are only listening on localhost. We are using an Nginx reverse proxy to serve actual user requests. 

Edit your `/etc/nginx/sites-enabled/default` config file to look like this (replace my.server.name with your actual hostname):  
    
    upstream broker {
      server 127.0.0.1:4000;
    }
    upstream kms {
      server 127.0.0.1:3000;
    }
    server {
      listen 80;
      server_name my.server.name;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      
      location /broker/ {
        proxy_pass http://broker;
      }
      location /kms/ {
        proxy_pass http://kms;
      }
      location / {
        deny all;
      }
    }
    
The services should never be exposed to the outside network without a load balancer or proxy like nginx. If you would like to use a different load balancer/proxy, please make sure to replicate the configuration exactly. It is vitally important to set the X-Forwarded-For header in the example above as leaving it out would open up a security issue.

Install SSL certificate and reconfigure Nginx:

    certbot --nginx
    
In the certbot interactive setup, you can either choose to redirect port 80 traffic to 443 or manually disable port 80 afterwards. We should be running an SSL-only service.
  
Congratulations! You should now have a working privEOS node.
    
### What's next?
Please continue [here](https://github.com/rawrat/privEOS#registering-your-node)


