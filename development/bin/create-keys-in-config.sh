#!/bin/sh

KEYS_OUTPUT=`cleos create key`
PUBLIC_KEY=$(echo "$KEYS_OUTPUT" | awk '/Public/ { print $3 }')
PRIVATE_KEY=$(echo "$KEYS_OUTPUT" | awk '/Private/ { print $3 }')

echo "$(cat config.json | jq --arg pub $PUBLIC_KEY --arg priv $PRIVATE_KEY '. + {eosPublicKey: $pub, eosPrivateKey: $priv}')" > config.json