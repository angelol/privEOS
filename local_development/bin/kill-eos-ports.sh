#!/usr/bin/env bash

source config.conf
source config-local.conf

kill $(lsof -t -i :$EOS_P2P_PORT)
kill $(lsof -t -i :$EOS_HTTP_PORT)