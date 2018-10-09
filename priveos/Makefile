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

build:
	$(EOSIOCPP_EXECUTABLE) -o $(PRIVEOS_CONTRACT_SRC_FOLDER)/$(CPP_IN).wasm $(PRIVEOS_CONTRACT_SRC_FOLDER)/$(CPP_IN).cpp
	
abi:
	$(EOSIOCPP_EXECUTABLE) -g $(PRIVEOS_CONTRACT_SRC_FOLDER)/$(CPP_IN).abi $(PRIVEOS_CONTRACT_SRC_FOLDER)/$(CPP_IN).cpp

deploy: build
	$(CLEOS) set contract $(EOS_ACCOUNT_NAME) ../$(CPP_IN)

init:
	make create_wallet
	make import_keys
	make setup_system
	make setup_accounts

create_wallet:
	$(CLEOS_EXECUTABLE) wallet create --name=eosio --file=/tmp/wallet_password
	./bin/store-wallet-pass-in-config.sh

create_keys:
	bin/create-keys-in-config.sh

import_keys:
	$(CLEOS_EXECUTABLE) wallet import --name=eosio --private-key=${EOS_PRIVATE_KEY}

unlock_wallet:
	$(CLEOS_EXECUTABLE) wallet unlock --name=eosio --password $(EOS_WALLET_PASSWORD)
		
system:
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

setup:
	$(CLEOS_EXECUTABLE) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio $(EOS_ACCOUNT_NAME) $(EOS_PUBLIC_KEY) $(EOS_PUBLIC_KEY)
	$(CLEOS_EXECUTABLE) set account permission $(EOS_ACCOUNT_NAME) active '{"threshold": 1,"keys": [{"key": "$(EOS_PUBLIC_KEY)","weight": 1}],"accounts": [{"permission":{"actor":"$(EOS_ACCOUNT_NAME)","permission":"eosio.code"},"weight":1}]}' owner -p $(EOS_ACCOUNT_NAME)
	$(CLEOS_EXECUTABLE) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnode1 ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	$(CLEOS_EXECUTABLE) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnode2 ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	$(CLEOS_EXECUTABLE) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnode3 ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	$(CLEOS_EXECUTABLE) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnode4 ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
	$(CLEOS_EXECUTABLE) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnode5 ${EOS_PUBLIC_KEY} ${EOS_PUBLIC_KEY}
