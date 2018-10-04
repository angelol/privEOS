EOS_ACCOUNT_NAME=`cat ./config.json | jq '.eosAccountName' -r`
EOS_REPO_DIR=`cat ./config.json | jq '.eosRepoDir' -r`
EOS_CONTRACTS_DIR=`${EOS_REPO_DIR}/contracts`
EOS_NODEOS_DATA_DIR=`cat ./config.json | jq '.eosNodeosDataDir' -r`
PM2_PROCESSES_FILE="pm2-processes.json"

eos_init:
	pm2 start ${PM2_PROCESSES_FILE} --only eos_node
	sleep 3
	make eos_create_wallet
	make eos_create_keys

eos_create_wallet:
	cleos wallet create --name=${EOS_ACCOUNT_NAME}

eos_create_keys:
	bin/create-keys-in-config.sh

eos_flush:
	pm2 stop ${PM2_PROCESSES_FILE} eos_node
	sleep 3
	rm -r "${EOS_NODEOS_DATA_DIR}/blocks"
	rm -r "${EOS_NODEOS_DATA_DIR}/shared_mem"
	rm -r "${EOS_NODEOS_DATA_DIR}/${EOS_ACCOUNT_NAME}.wallet"