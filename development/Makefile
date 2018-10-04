EOS_ACCOUNT_NAME=`cat ./config.json | jq '.eosAccountName' -r`
EOS_PUBLIC_KEY=`cat ./config.json | jq '.eosPublicKey' -r`
EOS_PRIVATE_KEY=`cat ./config.json | jq '.eosPrivateKey' -r`
EOS_REPO_DIR=`cat ./config.json | jq '.eosRepoDir' -r`
EOS_CONTRACTS_DIR="${EOS_REPO_DIR}/build/contracts"
EOS_NODEOS_DATA_DIR=`cat ./config.json | jq '.eosNodeosDataDir' -r`
PM2_SERVICES_FILE="pm2-services.json"
PM2_EOS_DOCKER_FILE="pm2-eos-docker.json"
PM2_EOS_NATIVE_FILE="pm2-eos-native.json"

eos_docker_start:
	make eos_docker_stop
	make eos_docker_remove
	./bin/start-eos-docker.sh

eos_docker_stop:
	./bin/stop-eos-docker.sh

eos_docker_remove:
	./bin/remove-eos-docker.sh

eos_native_start:
	pm2 start ${PM2_EOS_NATIVE_FILE}

eos_docker_test_connection:
	curl http://localhost:8888/v1/chain/get_info

# for the docker version, alias the cleos in the local shell to the one in docker
cleos_link_docker:
	 alias cleos='docker exec -it nodeos /opt/eosio/bin/cleos --url http://127.0.0.1:8888 --wallet-url http://[keosd_ip]:9876'

eos_init:
	#make eos_create_wallet
	make eos_create_keys
	make eos_import_keys
	make eos_install_bios
	make eos_setup_system
	make eos_setup_accounts

eos_create_wallet:
	cleos wallet create --name=${EOS_ACCOUNT_NAME}

eos_create_keys:
	bin/create-keys-in-config.sh

eos_import_keys:
	cleos wallet import --name=${EOS_ACCOUNT_NAME} ${EOS_PRIVATE_KEY}

eos_flush_docker:
	pm2 stop ${PM2_EOS_DOCKER_FILE}
	sleep 3
	rm -r "${EOS_NODEOS_DATA_DIR}/*"

eos_flush_native:
	pm2 stop ${PM2_EOS_NATIVE_FILE}
	sleep 3
	rm -r "${EOS_NODEOS_DATA_DIR}/blocks"
	rm -r "${EOS_NODEOS_DATA_DIR}/shared_mem"
	rm -r "${EOS_NODEOS_DATA_DIR}/${EOS_ACCOUNT_NAME}.wallet"

eos_install_bios:
	cleos set contract eosio $(EOS_CONTRACTS_DIR)/eosio.bios -p eosio

eos_setup_system:
	cleos create account eosio angelo ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	cleos create account eosio eosio.token ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	cleos create account eosio eosio.msig ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	cleos create account eosio eosio.bpay ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	cleos create account eosio eosio.names ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	cleos create account eosio eosio.ram ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	cleos create account eosio eosio.ramfee ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	cleos create account eosio eosio.saving ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	cleos create account eosio eosio.stake ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	cleos create account eosio eosio.vpay ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	cleos set contract eosio.token $(EOS_CONTRACTS_DIR)/eosio.token -p eosio.token
	cleos set contract eosio.msig $(EOS_CONTRACTS_DIR)/eosio.msig -p eosio.msig
	cleos push action eosio.token create '["eosio", "10000000000.0000 EOS",0,0,0]' -p eosio.token
	cleos push action eosio.token issue '["eosio","1000000000.0000 EOS", "issue"]' -p eosio
	cleos transfer eosio angelo "1000.0000 EOS"
	cleos set contract eosio $(EOS_CONTRACTS_DIR)/eosio.system -p eosio

eos_setup_accounts:
	cleos system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio $(EOS_ACCOUNT_NAME) ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	cleos set account permission $(EOS_ACCOUNT_NAME) active '{"threshold": 1,"keys": [{"key": "${EOS_PUBLIC_KEY}","weight": 1}],"accounts": [{"permission":{"actor":"$(EOS_ACCOUNT_NAME)","permission":"eosio.code"},"weight":1}]}' owner -p $(EOS_ACCOUNT_NAME)
	cleos system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnode1 ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	cleos system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnode2 ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	cleos system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnode3 ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	cleos system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnode4 ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	cleos system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnode5 ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	