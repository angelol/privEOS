include config
-include config.local

build:
	eosiocpp -o $(CPP_IN).wasm $(CPP_IN).cpp
	
abi:
	eosiocpp -g $(CPP_IN).abi $(CPP_IN).cpp

deploy: build
	$(CLEOS) set contract $(CONTRACT_ACCOUNT) ../$(CPP_IN)

system:
	$(CLEOS) create account eosio angelo $(PK) $(PK)
	$(CLEOS) create account eosio eosio.token $(PK) $(PK)
	$(CLEOS) create account eosio eosio.msig $(PK) $(PK)
	$(CLEOS) create account eosio eosio.bpay $(PK) $(PK)
	$(CLEOS) create account eosio eosio.names $(PK) $(PK)
	$(CLEOS) create account eosio eosio.ram $(PK) $(PK)
	$(CLEOS) create account eosio eosio.ramfee $(PK) $(PK)
	$(CLEOS) create account eosio eosio.saving $(PK) $(PK)
	$(CLEOS) create account eosio eosio.stake $(PK) $(PK)
	$(CLEOS) create account eosio eosio.vpay $(PK) $(PK)
	$(CLEOS) set contract eosio.token $(EOS_CONTRACTS_DIR)/eosio.token -p eosio.token
	$(CLEOS) set contract eosio.msig $(EOS_CONTRACTS_DIR)/eosio.msig -p eosio.msig
	$(CLEOS) push action eosio.token create '["eosio", "10000000000.0000 EOS",0,0,0]' -p eosio.token
	$(CLEOS) push action eosio.token issue '["eosio","1000000000.0000 EOS", "issue"]' -p eosio
	$(CLEOS) transfer eosio angelo "1000.0000 EOS"
	$(CLEOS) set contract eosio $(EOS_CONTRACTS_DIR)/eosio.system -p eosio


setup:
	$(CLEOS) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio $(CONTRACT_ACCOUNT) $(PK) $(PK)
	$(CLEOS) set account permission $(CONTRACT_ACCOUNT) active '{"threshold": 1,"keys": [{"key": "$(PK)","weight": 1}],"accounts": [{"permission":{"actor":"$(CONTRACT_ACCOUNT)","permission":"eosio.code"},"weight":1}]}' owner -p $(CONTRACT_ACCOUNT)
	$(CLEOS) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnode1 $(PK) $(PK)
	$(CLEOS) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnode2 $(PK) $(PK)
	$(CLEOS) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnode3 $(PK) $(PK)
	$(CLEOS) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnode4 $(PK) $(PK)
	$(CLEOS) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnode5 $(PK) $(PK)
	
regnodes:
	$(CLEOS) push action $(CONTRACT_ACCOUNT) regnode '["testnode1", "$(PK)", "http://localhost:3001"]' -p testnode1
	$(CLEOS) push action $(CONTRACT_ACCOUNT) regnode '["testnode2", "$(PK)", "http://localhost:3002"]' -p testnode2
	$(CLEOS) push action $(CONTRACT_ACCOUNT) regnode '["testnode3", "$(PK)", "http://localhost:3003"]' -p testnode3
	$(CLEOS) push action $(CONTRACT_ACCOUNT) regnode '["testnode4", "$(PK)", "http://localhost:3004"]' -p testnode4
	$(CLEOS) push action $(CONTRACT_ACCOUNT) regnode '["testnode5", "$(PK)", "http://localhost:3005"]' -p testnode5
	
shownodes:
	$(CLEOS) get table $(CONTRACT_ACCOUNT) $(CONTRACT_ACCOUNT) nodes

clean:
	rm -f $(CPP_IN).wast $(CPP_IN).wasm $(CPP_IN).abi 
