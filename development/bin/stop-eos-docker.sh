#!/bin/sh
docker ps -a | grep "nodeos" | awk '{print $1}' | xargs docker stop
docker ps -a | grep "keosd" | awk '{print $1}' | xargs docker stop