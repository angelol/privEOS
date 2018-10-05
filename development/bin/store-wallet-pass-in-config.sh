#!/bin/sh

DOCKER_CONTAINER=$(docker ps -a | grep "nodeos" | awk '{print $1}')
PASS=$(docker exec -it $DOCKER_CONTAINER cat /tmp/wallet_password)
PASS="${PASS%\"}"
PASS="${PASS#\"}"

echo "$(cat config.json | jq --arg pass $PASS '. + {eosWalletPassword: $pass}')" > config.json