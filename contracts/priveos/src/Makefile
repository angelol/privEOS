include config.conf
-include config-local.conf

EOS_ENDPOINT?=http://localhost:8888
CLEOS_ENDPOINT=${CLEOS} -u ${EOS_ENDPOINT}

build:
	 eosio-cpp -Wall -Werror -I. -D=LOCAL -abigen $(CPP_IN).cpp -o $(CPP_IN).wasm 

token:
	 eosio-cpp -I. -abigen eosio.token.cpp -o eosio.token.wasm 

deploy: build
	$(CLEOS_ENDPOINT) set contract $(CONTRACT_ACCOUNT) ../src $(CPP_IN).wasm $(CPP_IN).abi
	
deploy_token: token
	$(CLEOS_ENDPOINT) set contract priveostoken ../src eosio.token.wasm eosio.token.abi

init:
	make system
	make setup
	make deploy_token
	make deploy
	make create_tokens
	make init_contract
	make regnodes
	make fundusers
	make addcurrency
	make setprice
	make admsetprice
	make watchdogpermissions
	make activatenodes
	make vote


create_wallet:
	$(CLEOS) wallet create --name=$(WALLET) --file=wallet-password.txt

import_keys:
	$(CLEOS) wallet import --name=$(WALLET) --private-key=$(PRIVATE_KEY)
	$(CLEOS) wallet import --name=$(WALLET) --private-key=$(ALICE_PRIVATE_KEY)
	$(CLEOS) wallet import --name=$(WALLET) --private-key=$(BOB_PRIVATE_KEY)

unlock:
	$(CLEOS) wallet unlock --name=$(WALLET) --password $(WALLET_PASSWORD)
		
system:
	$(CLEOS_ENDPOINT) create account eosio eosio.token $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS_ENDPOINT) create account eosio eosio.msig $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS_ENDPOINT) create account eosio eosio.bpay $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS_ENDPOINT) create account eosio eosio.names $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS_ENDPOINT) create account eosio eosio.ram $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS_ENDPOINT) create account eosio eosio.ramfee $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS_ENDPOINT) create account eosio eosio.saving $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS_ENDPOINT) create account eosio eosio.stake $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS_ENDPOINT) create account eosio eosio.vpay $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS_ENDPOINT) create account eosio eosio.rex $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS_ENDPOINT) set contract eosio.token $(EOS_CONTRACTS_DIR)/eosio.token -p eosio.token
	$(CLEOS_ENDPOINT) set contract eosio.msig $(EOS_CONTRACTS_DIR)/eosio.msig -p eosio.msig
	$(CLEOS_ENDPOINT) push action eosio.token create '["eosio", "10000000000.0000 EOS",0,0,0]' -p eosio.token
	$(CLEOS_ENDPOINT) push action eosio.token issue '["eosio","1000000000.0000 EOS", "issue"]' -p eosio
	$(CLEOS_ENDPOINT) set contract eosio $(EOS_CONTRACTS_DIR)/eosio.system -p eosio
	$(CLEOS_ENDPOINT) push action eosio init '[0, "4,EOS"]' -p eosio

xxx:
	$(CLEOS_ENDPOINT) push action $(CONTRACT_ACCOUNT) test '["testnodexxx1"]'  -p $(CONTRACT_ACCOUNT)

setup:
	$(CLEOS_ENDPOINT) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio $(CONTRACT_ACCOUNT) $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS_ENDPOINT) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio dappcontract $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS_ENDPOINT) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio slantagpurse $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS_ENDPOINT) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio $(ALICE) $(ALICE_PUBLIC_KEY) $(ALICE_PUBLIC_KEY)
	$(CLEOS_ENDPOINT) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio $(BOB) $(BOB_PUBLIC_KEY) $(BOB_PUBLIC_KEY)
	$(CLEOS_ENDPOINT) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio priveostoken $(BOB_PUBLIC_KEY) $(BOB_PUBLIC_KEY)
	$(CLEOS_ENDPOINT) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio priveosxfees $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS_ENDPOINT) set account permission $(CONTRACT_ACCOUNT) active '{"threshold": 1,"keys": [{"key": "$(PUBLIC_KEY)","weight": 1}],"accounts": [{"permission":{"actor":"$(CONTRACT_ACCOUNT)","permission":"eosio.code"},"weight":1}]}' owner -p $(CONTRACT_ACCOUNT)
	$(CLEOS_ENDPOINT) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnodexxx1 $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS_ENDPOINT) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnodexxx2 $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS_ENDPOINT) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnodexxx3 $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS_ENDPOINT) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnodexxx4 $(PUBLIC_KEY) $(PUBLIC_KEY)
	$(CLEOS_ENDPOINT) system newaccount --stake-net "1.0000 EOS" --stake-cpu "1.0000 EOS" --buy-ram-kbytes 8000 eosio testnodexxx5 $(PUBLIC_KEY) $(PUBLIC_KEY)

init_contract:
	$(CLEOS_ENDPOINT) push action $(CONTRACT_ACCOUNT) init '[]' -p $(CONTRACT_ACCOUNT)

create_tokens:
	$(CLEOS_ENDPOINT) push action priveostoken create '[$(CONTRACT_ACCOUNT), "1000.0000 PRIVEOS"]' -p priveostoken
	$(CLEOS_ENDPOINT) push action priveostoken create '[$(CONTRACT_ACCOUNT), "461168601842738.0000 NODET"]' -p priveostoken

fundusers:
	$(CLEOS_ENDPOINT) transfer eosio $(ALICE) "100.0000 EOS" -p eosio
	$(CLEOS_ENDPOINT) transfer eosio $(BOB) "100.0000 EOS" -p eosio

	
regnodes:
	$(CLEOS_ENDPOINT) push action $(CONTRACT_ACCOUNT) regnode '["testnodexxx1", "$(PK_NODE_1)", "http://localhost:8001"]' -p testnodexxx1
	$(CLEOS_ENDPOINT) push action $(CONTRACT_ACCOUNT) regnode '["testnodexxx2", "$(PK_NODE_2)", "http://localhost:8002"]' -p testnodexxx2
	$(CLEOS_ENDPOINT) push action $(CONTRACT_ACCOUNT) regnode '["testnodexxx3", "$(PK_NODE_3)", "http://localhost:8003"]' -p testnodexxx3
	$(CLEOS_ENDPOINT) push action $(CONTRACT_ACCOUNT) regnode '["testnodexxx4", "$(PK_NODE_4)", "http://localhost:8004"]' -p testnodexxx4
	$(CLEOS_ENDPOINT) push action $(CONTRACT_ACCOUNT) regnode '["testnodexxx5", "$(PK_NODE_5)", "http://localhost:8005"]' -p testnodexxx5

watchdogpermissions:
	$(CLEOS_ENDPOINT) set account permission testnodexxx1 watchdog $(WATCHDOG_KEY) active
	$(CLEOS_ENDPOINT) set action permission testnodexxx1 priveosrules peerappr watchdog
	$(CLEOS_ENDPOINT) set action permission testnodexxx1 priveosrules peerdisappr watchdog
	$(CLEOS_ENDPOINT) set account permission testnodexxx2 watchdog $(WATCHDOG_KEY) active
	$(CLEOS_ENDPOINT) set action permission testnodexxx2 priveosrules peerappr watchdog
	$(CLEOS_ENDPOINT) set action permission testnodexxx2 priveosrules peerdisappr watchdog
	$(CLEOS_ENDPOINT) set account permission testnodexxx3 watchdog $(WATCHDOG_KEY) active
	$(CLEOS_ENDPOINT) set action permission testnodexxx3 priveosrules peerappr watchdog
	$(CLEOS_ENDPOINT) set action permission testnodexxx3 priveosrules peerdisappr watchdog
	$(CLEOS_ENDPOINT) set account permission testnodexxx4 watchdog $(WATCHDOG_KEY) active
	$(CLEOS_ENDPOINT) set action permission testnodexxx4 priveosrules peerappr watchdog
	$(CLEOS_ENDPOINT) set action permission testnodexxx4 priveosrules peerdisappr watchdog
	$(CLEOS_ENDPOINT) set account permission testnodexxx5 watchdog $(WATCHDOG_KEY) active
	$(CLEOS_ENDPOINT) set action permission testnodexxx5 priveosrules peerappr watchdog
	$(CLEOS_ENDPOINT) set action permission testnodexxx5 priveosrules peerdisappr watchdog
	
activatenodes:
	$(CLEOS_ENDPOINT) push action $(CONTRACT_ACCOUNT) admactivate '["testnodexxx1"]' -p slantagpurse
	$(CLEOS_ENDPOINT) push action $(CONTRACT_ACCOUNT) admactivate '["testnodexxx2"]' -p slantagpurse
	$(CLEOS_ENDPOINT) push action $(CONTRACT_ACCOUNT) admactivate '["testnodexxx3"]' -p slantagpurse
	$(CLEOS_ENDPOINT) push action $(CONTRACT_ACCOUNT) admactivate '["testnodexxx4"]' -p slantagpurse
	$(CLEOS_ENDPOINT) push action $(CONTRACT_ACCOUNT) admactivate '["testnodexxx5"]' -p slantagpurse


admunreg:
	$(CLEOS_ENDPOINT) push action $(CONTRACT_ACCOUNT) admunreg '["testnodexxx1"]' -p $(CONTRACT_ACCOUNT)

unregnode:
	$(CLEOS_ENDPOINT) push action $(CONTRACT_ACCOUNT) unregnode '["testnodexxx3"]' -p testnodexxx3

shownodes:
	$(CLEOS_ENDPOINT) get table $(CONTRACT_ACCOUNT) $(CONTRACT_ACCOUNT) nodes

approvals:
	$(CLEOS_ENDPOINT) get table $(CONTRACT_ACCOUNT) $(CONTRACT_ACCOUNT) peerapproval

disapprovals:
	$(CLEOS_ENDPOINT) get table $(CONTRACT_ACCOUNT) $(CONTRACT_ACCOUNT) peerdisappr
	
approve:
	$(CLEOS_ENDPOINT) push action $(CONTRACT_ACCOUNT) peerappr '["testnodexxx1", "testnodexxx2"]' -p testnodexxx1
	
disapprove:
	$(CLEOS_ENDPOINT) push action $(CONTRACT_ACCOUNT) peerdisappr '["testnodexxx1", "testnodexxx2"]' -p testnodexxx1

admsetprice:
	$(CLEOS_ENDPOINT) push action $(CONTRACT_ACCOUNT) admsetprice '["0.0100 EOS", "accessgrant"]' -p $(CONTRACT_ACCOUNT)
	$(CLEOS_ENDPOINT) push action $(CONTRACT_ACCOUNT) admsetprice '["0.0200 EOS", "store"]' -p $(CONTRACT_ACCOUNT)
	
setprice:
	$(CLEOS_ENDPOINT) push action $(CONTRACT_ACCOUNT) setprice '["testnodexxx1", "1000.0000 EUR", "accessgrant"]' -p testnodexxx1
	$(CLEOS_ENDPOINT) push action $(CONTRACT_ACCOUNT) setprice '["testnodexxx1", "0.0000 EOS", "store"]' -p testnodexxx1
	$(CLEOS_ENDPOINT) push action $(CONTRACT_ACCOUNT) setprice '["testnodexxx2", "0.1000 EOS", "store"]' -p testnodexxx2

	$(CLEOS_ENDPOINT) push action $(CONTRACT_ACCOUNT) setprice '["testnodexxx2", "2000.0000 EUR", "accessgrant"]' -p testnodexxx2
	$(CLEOS_ENDPOINT) push action $(CONTRACT_ACCOUNT) setprice '["testnodexxx3", "2.0000 EOS", "accessgrant"]' -p testnodexxx3
	$(CLEOS_ENDPOINT) push action $(CONTRACT_ACCOUNT) setprice '["testnodexxx4", "0.1000 EOS", "accessgrant"]' -p testnodexxx4
	$(CLEOS_ENDPOINT) push action $(CONTRACT_ACCOUNT) setprice '["testnodexxx5", "0.0000 EOS", accessgrant]' -p testnodexxx5


showpricefeed:
	$(CLEOS_ENDPOINT) get scope -t storepricef $(CONTRACT_ACCOUNT)
	$(CLEOS_ENDPOINT) get scope -t readpricef $(CONTRACT_ACCOUNT)
		
	
showprice:
	$(CLEOS_ENDPOINT) get table $(CONTRACT_ACCOUNT) $(CONTRACT_ACCOUNT) readprice
	$(CLEOS_ENDPOINT) get table $(CONTRACT_ACCOUNT) $(CONTRACT_ACCOUNT) storeprice

addcurrency:
	$(CLEOS_ENDPOINT) push action $(CONTRACT_ACCOUNT) addcurrency '["4,EOS", "eosio.token"]' -p $(CONTRACT_ACCOUNT)
	$(CLEOS_ENDPOINT) push action $(CONTRACT_ACCOUNT) addcurrency '["2,EUR", "eurotoken"]' -p $(CONTRACT_ACCOUNT)
showcurrency:
	$(CLEOS_ENDPOINT) get table $(CONTRACT_ACCOUNT) $(CONTRACT_ACCOUNT) currencies

prepare:
	$(CLEOS_ENDPOINT) push action $(CONTRACT_ACCOUNT) prepare '["$(ALICE)", "4,EOS"]' -p $(ALICE)
	$(CLEOS_ENDPOINT) push action $(CONTRACT_ACCOUNT) prepare '["$(BOB)", "4,EOS"]' -p $(BOB)
	
deposit:
	$(CLEOS_ENDPOINT) transfer $(ALICE) $(CONTRACT_ACCOUNT) "1.0000 EOS" -p $(ALICE)
	$(CLEOS_ENDPOINT) transfer $(BOB) $(CONTRACT_ACCOUNT) "1.0000 EOS" -p $(BOB)

showbalances:
	$(CLEOS_ENDPOINT) get table $(CONTRACT_ACCOUNT) $(ALICE) balances
	$(CLEOS_ENDPOINT) get table $(CONTRACT_ACCOUNT) $(BOB) balances

vote:
	$(CLEOS_ENDPOINT) push action ${CONTRACT_ACCOUNT} vote '["dappcontract", ["testnodexxx2", "testnodexxx3", "testnodexxx1"]]' -p dappcontract
	
testrand:
	$(CLEOS_ENDPOINT) push action ${CONTRACT_ACCOUNT} testrand '["$(CONTRACT_ACCOUNT)"]' -p $(CONTRACT_ACCOUNT)
	
showvotes:
	$(CLEOS_ENDPOINT) get table $(CONTRACT_ACCOUNT) $(CONTRACT_ACCOUNT) voters
		
		# cleos push action eosio voteproducer '["voter", "proxy", ["producers"]]'
clean:
	rm -f $(CPP_IN).wast $(CPP_IN).wasm $(CPP_IN).abi 
