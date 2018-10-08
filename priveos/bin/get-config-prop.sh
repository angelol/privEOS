#!/bin/sh
cat $(./bin/get-config-file.sh) | jq '.'${1} -r