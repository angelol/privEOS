#!/bin/sh
DOCKER_CONTAINER=$(docker ps -a | grep "nodeos" | awk '{print $1}')
docker exec -it $DOCKER_CONTAINER /eos/eosio_build.sh -s EOS