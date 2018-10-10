#!/bin/sh
numbers=(1 2 3 4 5)
for n in ${numbers[*]}
do
    pm2 restart priveos_kms_node_${n}
done