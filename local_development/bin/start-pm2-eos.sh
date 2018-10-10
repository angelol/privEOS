#!/bin/sh
pm2 start pm2-eos.json ${1}
sleep 2
pm2 restart eos