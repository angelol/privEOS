#!/bin/sh
docker ps -a | grep "nodeos" | awk '{print $1}' | xargs docker stop