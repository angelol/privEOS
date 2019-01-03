# privEOS

This is the main privEOS repository containing the server-side software that all nodes in the privEOS network must run.

## Node Setup Guide

We are assuming Ubuntu 18.04 in this guide. If possible, use the XFS file system for better performance with mongodb.

### Install Dependencies

Install the Let's Encrypt certbot, so we can use https for everything:

    apt-get update
    apt-get install software-properties-common
    add-apt-repository universe
    add-apt-repository ppa:certbot/certbot
    apt-get update
    apt-get install python-certbot-nginx
    
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
    
### Install privEOS Services

    adduser priveos --disabled-password
    adduser encryptionservice --disabled-password

    su - priveos
    git clone https://github.com/rawrat/privEOS.git
    cd privEOS
    npm install
    cp common/config.js-example common/config.js
    vi common/config.js
    
When editing the config file, make sure to enter a valid `httpEndpoint` of the chain you want to connect to and a matching `chainId`. Under `nodeAccount`, enter your EOS BP account that you will use to `regnode` with the privEOS contract. If you're following this guide, you don't need to touch the rest of the values.

Start service and check log output:

    pm2 start live.yml
    pm2 log
        

To install pm2 startup script, run

    pm2 save
    pm2 startup
And execute the suggested command in the output as root.


    su - encryptionservice 
    git clone https://github.com/rawrat/priveos-encryption-service.git
    cd priveos-encryption-service
    npm install
    cp config.js-example config.js
Add your private key to the config file

    vi config.js
Start service and check log output for potential error messages:

    pm2 start live.yml
    pm2 log

### Nginx setup
The privEOS services are now running but for security reasons, they are only listening on localhost. We are using an Nginx reverse proxy to serve actual user requests.

We are going to configure the broker to run on port 443 to make sure users will see a nice URL. The KMS service is only used internally and communicates only with the brokers, so we can leave that on a higher port.
    
    server {
      listen 443;
      server_name my.server.name;
      
      upstream broker {
        server 127.0.0.1:4000;
      }
      
      location / {
        proxy_pass http://broker/;
      }
    }
    server {
      listen 3000;
      server_name my.server.name;
      
      upstream kms {
        server 127.0.0.1:3000;
      }
      
      location / {
        proxy_pass http://broker/;
      }
    }
    
### Register your Node

To install pm2 startup script, run

    pm2 save
    pm2 startup
And execute the suggested command in the output as root.
    

Registering with the Smart Contract

    cleos -u https://jungle2.cryptolions.io push action priveosrules regnode '["slantagnode1", "EOS5aQ2K8Qwgy4XwqQaZV7WuJuNHnmGrXe5RX4ukMtF1FBSJwfAUv", "http://88.99.174.227:3000"]' -p slantagnode1
    cleos -u https://jungle2.cryptolions.io push action priveosrules setprice '["slantagnode1", "0.0100 EOS", "accessgrant"]' -p slantagnode1
    cleos -u https://jungle2.cryptolions.io push action priveosrules setprice '["slantagnode1", "0.0000 EOS", "store"]' -p slantagnode1



