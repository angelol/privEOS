#!/bin/sh
bin/stop-eos-docker.sh
bin/remove-eos-docker.sh
bin/start-eos-docker.sh
sleep 3
bin/build-eos-docker.sh
