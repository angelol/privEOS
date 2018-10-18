include config.conf
-include config-local.conf

build:
	eosiocpp -o $(CPP_IN).wasm $(CPP_IN).cpp
	
abi:
	eosiocpp -g $(CPP_IN).abi $(CPP_IN).cpp

deploy: build
	$(CLEOS) set contract $(CONTRACT_ACCOUNT) ../$(CPP_IN)

init:
	make system
	make setup
	make abi
	make deploy
	make regnodes

create_wallet:
	$(CLEOS) wallet create --name=eosio --file=wallet-password.txt

import_keys:
	$(CLEOS) wallet import --name=eosio --private-key=$(PRIVATE_KEY)

unlock_wallet:
	$(CLEOS) wallet unlock --name=eosio --password $(WALLET_PASSWORD)
		
system:
	$(CLEOS) create account eosio eosio.token $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS) create account eosio eosio.msig $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS) create account eosio eosio.bpay $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS) create account eosio eosio.names $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS) create account eosio eosio.ram $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS) create account eosio eosio.ramfee $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS) create account eosio eosio.saving $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS) create account eosio eosio.stake $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS) create account eosio eosio.vpay $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS) set contract eosio.token $(EOS_CONTRACTS_DIR)/eosio.token -p eosio.token
	$(CLEOS) set contract eosio.msig $(EOS_CONTRACTS_DIR)/eosio.msig -p eosio.msig
	$(CLEOS) push action eosio.token create '["eosio", "10000000000.0000 EOS",0,0,0]' -p eosio.token
	$(CLEOS) push action eosio.token issue '["eosio","1000000000.0000 EOS", "issue"]' -p eosio
	$(CLEOS) set contract eosio $(EOS_CONTRACTS_DIR)/eosio.system -p eosio

setup:
	$(CLEOS) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio $(CONTRACT_ACCOUNT) $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio dappcontract $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio priveosalice EOS6Zy532Rgkuo1SKjYbPxLKYs8o2sEzLApNu8Ph66ysjstARrnHm EOS6Zy532Rgkuo1SKjYbPxLKYs8o2sEzLApNu8Ph66ysjstARrnHm
	$(CLEOS) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio priveosbob11 EOS87xyhE6czLCpuF8PaEGc3UiXHHyCMQB2zHygpEsXyDJHadHWFK EOS87xyhE6czLCpuF8PaEGc3UiXHHyCMQB2zHygpEsXyDJHadHWFK


	$(CLEOS) set account permission $(CONTRACT_ACCOUNT) active '{"threshold": 1,"keys": [{"key": "$(PUBLIC_KEY)","weight": 1}],"accounts": [{"permission":{"actor":"$(CONTRACT_ACCOUNT)","permission":"eosio.code"},"weight":1}]}' owner -p $(CONTRACT_ACCOUNT)
	$(CLEOS) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnodexxx1 $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnodexxx2 $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnodexxx3 $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnodexxx4 $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnodexxx5 $(PUBLIC_KEY) $(PUBLIC_KEY)
	
regnodes:
	$(CLEOS) push action $(CONTRACT_ACCOUNT) regnode '["testnodexxx1", "$(PK_NODE_1)", "http://localhost:3001"]' -p testnodexxx1
	$(CLEOS) push action $(CONTRACT_ACCOUNT) regnode '["testnodexxx2", "$(PK_NODE_2)", "http://localhost:3002"]' -p testnodexxx2
	$(CLEOS) push action $(CONTRACT_ACCOUNT) regnode '["testnodexxx3", "$(PK_NODE_3)", "http://localhost:3003"]' -p testnodexxx3
	$(CLEOS) push action $(CONTRACT_ACCOUNT) regnode '["testnodexxx4", "$(PK_NODE_4)", "http://localhost:3004"]' -p testnodexxx4
	$(CLEOS) push action $(CONTRACT_ACCOUNT) regnode '["testnodexxx5", "$(PK_NODE_5)", "http://localhost:3005"]' -p testnodexxx5

shownodes:
	$(CLEOS) get table $(CONTRACT_ACCOUNT) $(CONTRACT_ACCOUNT) nodes

clean:
	rm -f $(CPP_IN).wast $(CPP_IN).wasm $(CPP_IN).abi 
	
	
