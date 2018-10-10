#!/bin/sh

source config.conf
source config-local.conf

mongod --dbpath=${MONGO_DB_PATH}