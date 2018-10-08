EOS_ACCOUNT_NAME=`./bin/get-config-prop.sh eosAccountName`
EOS_WALLET_PASSWORD=`./bin/get-config-prop.sh eosWalletPassword`
EOS_PUBLIC_KEY=`./bin/get-config-prop.sh eosPublicKey`
EOS_PRIVATE_KEY=`./bin/get-config-prop.sh eosPrivateKey`
EOS_CONTRACTS_DIR=`./bin/get-config-prop.sh eosContractsDir`
EOS_NODEOS_DATA_DIR=`./bin/get-config-prop.sh eosNodeosDataDir`
CLEOS_EXECUTABLE=`./bin/get-config-prop.sh cleosExecutable`
EOSIOCPP_EXECUTABLE=`./bin/get-config-prop.sh eosiocppExecutable`
PM2_EOS_NATIVE_FILE="../development/pm2-eos-native.json"
PRIVEOS_CONTRACT_SRC_FOLDER=`./bin/get-config-prop.sh priveosContractSrcFolder`
CPP_IN=priveos

priveos_build:
	$(EOSIOCPP_EXECUTABLE) -o $(PRIVEOS_CONTRACT_SRC_FOLDER)/$(CPP_IN).wasm $(PRIVEOS_CONTRACT_SRC_FOLDER)/$(CPP_IN).cpp
	
priveos_abi:
	$(EOSIOCPP_EXECUTABLE) -g $(PRIVEOS_CONTRACT_SRC_FOLDER)/$(CPP_IN).abi $(PRIVEOS_CONTRACT_SRC_FOLDER)/$(CPP_IN).cpp

priveos_deploy: priveos_build
	$(CLEOS) set contract $(EOS_ACCOUNT_NAME) ../$(CPP_IN)

eos_native_start:
	# @angelo would be cool to have all the commands for docker at the end of the file
	# also in the same format for the native eos processes
	pm2 start ${PM2_EOS_NATIVE_FILE}

eos_init:
	make eos_create_wallet
	make eos_import_keys
	make eos_setup_system
	make eos_setup_accounts

eos_create_wallet:
	$(CLEOS_EXECUTABLE) wallet create --name=eosio --file=/tmp/wallet_password
	./bin/store-wallet-pass-in-config.sh

eos_create_keys:
	bin/create-keys-in-config.sh

eos_import_keys:
	$(CLEOS_EXECUTABLE) wallet import --name=eosio --private-key=${EOS_PRIVATE_KEY}

eos_unlock_wallet:
	$(CLEOS_EXECUTABLE) wallet unlock --name=eosio --password $(EOS_WALLET_PASSWORD)

eos_native_flush:
	pm2 stop ${PM2_EOS_NATIVE_FILE}
	sleep 3
	rm -r "${EOS_NODEOS_DATA_DIR}/blocks"
	rm -r "${EOS_NODEOS_DATA_DIR}/shared_mem"
	rm -r "${EOS_NODEOS_DATA_DIR}/${EOS_ACCOUNT_NAME}.wallet"

eos_docker_build:
	./bin/build-eos-docker.sh
		
eos_setup_system:
	$(CLEOS_EXECUTABLE) create account eosio angelo ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	$(CLEOS_EXECUTABLE) create account eosio eosio.token ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	$(CLEOS_EXECUTABLE) create account eosio eosio.msig ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	$(CLEOS_EXECUTABLE) create account eosio eosio.bpay ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	$(CLEOS_EXECUTABLE) create account eosio eosio.names ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	$(CLEOS_EXECUTABLE) create account eosio eosio.ram ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	$(CLEOS_EXECUTABLE) create account eosio eosio.ramfee ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	$(CLEOS_EXECUTABLE) create account eosio eosio.saving ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	$(CLEOS_EXECUTABLE) create account eosio eosio.stake ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	$(CLEOS_EXECUTABLE) create account eosio eosio.vpay ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	$(CLEOS_EXECUTABLE) set contract eosio.token $(EOS_CONTRACTS_DIR)/eosio.token -p eosio.token
	$(CLEOS_EXECUTABLE) set contract eosio.msig $(EOS_CONTRACTS_DIR)/eosio.msig -p eosio.msig
	$(CLEOS_EXECUTABLE) push action eosio.token create '["eosio", "10000000000.0000 EOS",0,0,0]' -p eosio.token
	$(CLEOS_EXECUTABLE) push action eosio.token issue '["eosio","1000000000.0000 EOS", "issue"]' -p eosio
	$(CLEOS_EXECUTABLE) transfer eosio angelo "1000.0000 EOS"
	$(CLEOS_EXECUTABLE) set contract eosio $(EOS_CONTRACTS_DIR)/eosio.system -p eosio

eos_setup_accounts:
	$(CLEOS_EXECUTABLE) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio $(EOS_ACCOUNT_NAME) $(EOS_PUBLIC_KEY) $(EOS_PUBLIC_KEY)
	$(CLEOS_EXECUTABLE) set account permission $(EOS_ACCOUNT_NAME) active '{"threshold": 1,"keys": [{"key": "'$(EOS_PUBLIC_KEY)'","weight": 1}],"accounts": [{"permission":{"actor":"'$(EOS_ACCOUNT_NAME)'","permission":"eosio.code"},"weight":1}]}' owner -p $(EOS_ACCOUNT_NAME)
	$(CLEOS_EXECUTABLE) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnode1 ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	$(CLEOS_EXECUTABLE) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnode2 ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	$(CLEOS_EXECUTABLE) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnode3 ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	$(CLEOS_EXECUTABLE) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnode4 ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	$(CLEOS_EXECUTABLE) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnode5 ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}

eos_docker_rebuild:
	make eos_docker_stop
	make eos_docker_remove
	make eos_docker_start
	sleep 3
	make eos_docker_build

eos_docker_restart:
	make eos_docker_stop
	make eos_docker_remove
	make eos_docker_start

eos_docker_start:
	./bin/start-eos-docker.sh $(EOS_NODEOS_DATA_DIR)

eos_docker_stop:
	./bin/stop-eos-docker.sh

eos_docker_remove:
	./bin/remove-eos-docker.sh

eos_docker_build:
	./bin/build-eos-docker.sh

eos_docker_test_connection:
	curl http://localhost:8888/v1/chain/get_info

eos_docker_flush:
	echo "This command will wipe all data in 5 seconds!"
	sleep 5
	make eos_docker_stop
	make eos_docker_remove
	sleep 3
	rm -r "${EOS_NODEOS_DATA_DIR}"