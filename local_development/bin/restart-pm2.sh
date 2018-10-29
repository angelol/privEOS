#!/usr/bin/env bash
pm2 delete all
sleep 3
bin/start-pm2-eos.sh
bin/start-pm2-services.sh
