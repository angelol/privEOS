include config.conf
-include config-local.conf

build:
	 eosio-cpp -abigen $(CPP_IN).cpp -o $(CPP_IN).wasm 
	
deploy: build
	$(CLEOS) set contract $(CONTRACT_ACCOUNT) ../$(CPP_IN)

init:
	make system
	make setup
	make deploy
	make regnodes
	make fundusers
	make addcurrency
	make setprice


create_wallet:
	$(CLEOS) wallet create --file=wallet-password.txt

import_keys:
	$(CLEOS) wallet import --name=eosio --private-key=$(PRIVATE_KEY)
	$(CLEOS) wallet import --name=eosio --private-key=$(ALICE_PRIVATE_KEY)
	$(CLEOS) wallet import --name=eosio --private-key=$(BOB_PRIVATE_KEY)

unlock:
	$(CLEOS) wallet unlock --password $(WALLET_PASSWORD)
		
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
	$(CLEOS) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio $(ALICE) $(ALICE_PUBLIC_KEY) $(ALICE_PUBLIC_KEY)
	$(CLEOS) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio $(BOB) $(BOB_PUBLIC_KEY) $(BOB_PUBLIC_KEY)
	$(CLEOS) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio priveosxfees $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS) set account permission $(CONTRACT_ACCOUNT) active '{"threshold": 1,"keys": [{"key": "$(PUBLIC_KEY)","weight": 1}],"accounts": [{"permission":{"actor":"$(CONTRACT_ACCOUNT)","permission":"eosio.code"},"weight":1}]}' owner -p $(CONTRACT_ACCOUNT)
	$(CLEOS) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnodexxx1 $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnodexxx2 $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnodexxx3 $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnodexxx4 $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnodexxx5 $(PUBLIC_KEY) $(PUBLIC_KEY)
	
fundusers:
	$(CLEOS) transfer eosio $(ALICE) "100.0000 EOS" -p eosio
	$(CLEOS) transfer eosio $(BOB) "100.0000 EOS" -p eosio

	
regnodes:
	$(CLEOS) push action $(CONTRACT_ACCOUNT) regnode '["testnodexxx1", "$(PK_NODE_1)", "http://localhost:3001"]' -p testnodexxx1
	$(CLEOS) push action $(CONTRACT_ACCOUNT) regnode '["testnodexxx2", "$(PK_NODE_2)", "http://localhost:3002"]' -p testnodexxx2
	$(CLEOS) push action $(CONTRACT_ACCOUNT) regnode '["testnodexxx3", "$(PK_NODE_3)", "http://localhost:3003"]' -p testnodexxx3
	$(CLEOS) push action $(CONTRACT_ACCOUNT) regnode '["testnodexxx4", "$(PK_NODE_4)", "http://localhost:3004"]' -p testnodexxx4
	$(CLEOS) push action $(CONTRACT_ACCOUNT) regnode '["testnodexxx5", "$(PK_NODE_5)", "http://localhost:3005"]' -p testnodexxx5

shownodes:
	$(CLEOS) get table $(CONTRACT_ACCOUNT) $(CONTRACT_ACCOUNT) nodes

setprice:
	$(CLEOS) push action $(CONTRACT_ACCOUNT) setprice '["testnodexxx1", "1000.0000 EUR", "accessgrant"]' -p testnodexxx1
	$(CLEOS) push action $(CONTRACT_ACCOUNT) setprice '["testnodexxx1", "0.0000 EOS", "store"]' -p testnodexxx1
	$(CLEOS) push action $(CONTRACT_ACCOUNT) setprice '["testnodexxx2", "0.1000 EOS", "store"]' -p testnodexxx2

	$(CLEOS) push action $(CONTRACT_ACCOUNT) setprice '["testnodexxx2", "2000.0000 EUR", "accessgrant"]' -p testnodexxx2
	$(CLEOS) push action $(CONTRACT_ACCOUNT) setprice '["testnodexxx3", "2.0000 EOS", "accessgrant"]' -p testnodexxx3
	$(CLEOS) push action $(CONTRACT_ACCOUNT) setprice '["testnodexxx4", "0.1000 EOS", "accessgrant"]' -p testnodexxx4
	$(CLEOS) push action $(CONTRACT_ACCOUNT) setprice '["testnodexxx5", "0.0000 EOS", accessgrant]' -p testnodexxx5


showpricefeed:
	$(CLEOS) get table $(CONTRACT_ACCOUNT) 4,EOS storepricef
	$(CLEOS) get table $(CONTRACT_ACCOUNT) 4,EOS readpricef
		
	
showprice:
	$(CLEOS) get table $(CONTRACT_ACCOUNT) $(CONTRACT_ACCOUNT) readprice
	$(CLEOS) get table $(CONTRACT_ACCOUNT) $(CONTRACT_ACCOUNT) storeprice

addcurrency:
	$(CLEOS) push action $(CONTRACT_ACCOUNT) addcurrency '["4,EOS", "eosio.token"]' -p $(CONTRACT_ACCOUNT)
	$(CLEOS) push action $(CONTRACT_ACCOUNT) addcurrency '["2,EUR", "eurotoken"]' -p $(CONTRACT_ACCOUNT)
showcurrency:
	$(CLEOS) get table $(CONTRACT_ACCOUNT) $(CONTRACT_ACCOUNT) currencies

prepare:
	$(CLEOS) push action $(CONTRACT_ACCOUNT) prepare '["$(ALICE)", "4,EOS"]' -p $(ALICE)
	
deposit:
	$(CLEOS) transfer $(ALICE) $(CONTRACT_ACCOUNT) "1.0000 EOS" -p $(ALICE)

showbalances:
	$(CLEOS) get table $(CONTRACT_ACCOUNT) $(ALICE) balances
	$(CLEOS) get table $(CONTRACT_ACCOUNT) $(BOB) balances

		
clean:
	rm -f $(CPP_IN).wast $(CPP_IN).wasm $(CPP_IN).abi 
