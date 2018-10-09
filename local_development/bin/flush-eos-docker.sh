#!/bin/sh
echo "This command will wipe all data in 5 seconds!"
sleep 5
make eos_docker_stop
make eos_docker_remove
sleep 3
rm -r "${EOS_NODEOS_DATA_DIR}"