#!/usr/bin/env bash
services=(broker client priveos_kms common)
for service in ${services[*]}
do
    cd ../${service} && npm install
done