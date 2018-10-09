include config.conf
-include config-local.conf

build:
	eosiocpp -o $(CPP_IN).wasm $(CPP_IN).cpp
	
abi:
	eosiocpp -g $(CPP_IN).abi $(CPP_IN).cpp

deploy: build
	cleos set contract $(CONTRACT_ACCOUNT) ../$(CPP_IN)

init:
	make create_wallet
	make import_keys
	make system
	make setup

create_wallet:
	cleos wallet create --name=eosio --file=wallet-password.txt

import_keys:
	cleos wallet import --name=eosio --private-key=$(PRIVATE_KEY)

unlock_wallet:
	cleos wallet unlock --name=eosio --password $(WALLET_PASSWORD)
		
system:
	cleos create account eosio angelo $(PUBLIC_KEY) $(PUBLIC_KEY)
	cleos create account eosio eosio.token $(PUBLIC_KEY) $(PUBLIC_KEY)
	cleos create account eosio eosio.msig $(PUBLIC_KEY) $(PUBLIC_KEY)
	cleos create account eosio eosio.bpay $(PUBLIC_KEY) $(PUBLIC_KEY)
	cleos create account eosio eosio.names $(PUBLIC_KEY) $(PUBLIC_KEY)
	cleos create account eosio eosio.ram $(PUBLIC_KEY) $(PUBLIC_KEY)
	cleos create account eosio eosio.ramfee $(PUBLIC_KEY) $(PUBLIC_KEY)
	cleos create account eosio eosio.saving $(PUBLIC_KEY) $(PUBLIC_KEY)
	cleos create account eosio eosio.stake $(PUBLIC_KEY) $(PUBLIC_KEY)
	cleos create account eosio eosio.vpay $(PUBLIC_KEY) $(PUBLIC_KEY)
	cleos set contract eosio.token $(EOS_CONTRACTS_DIR)/eosio.token -p eosio.token
	cleos set contract eosio.msig $(EOS_CONTRACTS_DIR)/eosio.msig -p eosio.msig
	cleos push action eosio.token create '["eosio", "10000000000.0000 EOS",0,0,0]' -p eosio.token
	cleos push action eosio.token issue '["eosio","1000000000.0000 EOS", "issue"]' -p eosio
	cleos transfer eosio angelo "1000.0000 EOS"
	cleos set contract eosio $(EOS_CONTRACTS_DIR)/eosio.system -p eosio

setup:
	cleos system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio $(CONTRACT_ACCOUNT) $(PUBLIC_KEY) $(PUBLIC_KEY)
	cleos set account permission $(CONTRACT_ACCOUNT) active '{"threshold": 1,"keys": [{"key": "$(PUBLIC_KEY)","weight": 1}],"accounts": [{"permission":{"actor":"$(CONTRACT_ACCOUNT)","permission":"eosio.code"},"weight":1}]}' owner -p $(CONTRACT_ACCOUNT)
	cleos system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnode1 $(PUBLIC_KEY) $(PUBLIC_KEY)
	cleos system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnode2 $(PUBLIC_KEY) $(PUBLIC_KEY)
	cleos system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnode3 $(PUBLIC_KEY) $(PUBLIC_KEY)
	cleos system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnode4 $(PUBLIC_KEY) $(PUBLIC_KEY)
	cleos system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnode5 $(PUBLIC_KEY) $(PUBLIC_KEY)
