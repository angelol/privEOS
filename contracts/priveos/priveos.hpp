/**
 *  @file
 *  @copyright defined in eos/LICENSE.txt
 */
#pragma once
#include <eosiolib/eosio.hpp>
#include <eosiolib/public_key.hpp>
#include <eosiolib/asset.hpp>
#include <eosiolib/symbol.hpp>

using namespace eosio;

CONTRACT priveos : public eosio::contract {
  using contract::contract;
  public:
    priveos(name self,name code, datastream<const char*> ds) : eosio::contract(self,code,ds), nodes(_self, _self.value), read_prices(_self, _self.value), store_prices(_self, _self.value), currencies(_self, _self.value), peerapprovals(_self, _self.value), peerdisapprovals(_self, _self.value){}
    
    static constexpr name fee_account{"priveosxfees"};
    const std::string accessgrant_action_name{"accessgrant"};
    const std::string store_action_name{"store"};    
    const static uint32_t FIVE_MINUTES{5*60};
    
    TABLE nodeinfo {
      name        owner;
      eosio::public_key   node_key;
      std::string         url;
      bool                is_active = false;
      
      uint64_t primary_key()const { return owner.value; }      
    };
    typedef multi_index<"nodes"_n, nodeinfo> nodes_table;
    nodes_table nodes;

    TABLE store_pricefeed {
      name node;
      asset price;
      uint64_t primary_key() const { return node.value; }
    };
    typedef multi_index<"storepricef"_n, store_pricefeed> store_pricefeed_table;

    
    TABLE read_pricefeed {
      name node;
      asset price;
      uint64_t primary_key() const { return node.value; }
    };
    typedef multi_index<"readpricef"_n, read_pricefeed> read_pricefeed_table;

    /*
     * Price for storing items (charged by the store action)
     */ 
    TABLE storeprice {
      asset money;
      uint64_t primary_key() const { return money.symbol.code().raw(); }
    };
    typedef multi_index<"storeprice"_n, storeprice> storeprice_table;
    storeprice_table store_prices;


    /*
     * Price for reading items (charged by the accessgrant action) 
     */ 
    TABLE readprice {
      asset money;
      uint64_t primary_key() const { return money.symbol.code().raw(); }
    };
    typedef multi_index<"readprice"_n, readprice> readprice_table;
    readprice_table read_prices;

    
    TABLE balance {
        asset funds;
        uint64_t primary_key() const { return funds.symbol.code().raw(); }        
    };    
    typedef multi_index<"balances"_n, balance> balances_table;

    TABLE currency_t {
      symbol currency;
      name contract;
      uint64_t primary_key() const { return currency.code().raw(); }  
    };
    typedef multi_index<"currencies"_n, currency_t> currencies_table;
    currencies_table currencies;
    
    TABLE peerapproval {
      name node;
      std::set<name> approved_by;
      uint32_t created_at;
      
      uint64_t primary_key() const { return node.value; } 
      bool is_expired() const { return (now() - created_at) > FIVE_MINUTES; }
    };
    typedef multi_index<"peerapproval"_n, peerapproval> peerapproval_table;
    peerapproval_table peerapprovals;
    
    TABLE peerdisapproval {
      name node;
      std::set<name> disapproved_by;
      uint32_t created_at;
      
      uint64_t primary_key() const { return node.value; } 
      bool is_expired() const { return (now() - created_at) > FIVE_MINUTES; }
    };
    typedef multi_index<"peerdisappr"_n, peerdisapproval> peerdisapproval_table;
    peerdisapproval_table peerdisapprovals;

    
    ACTION store(
      const name owner, 
      const name contract, 
      const std::string file, 
      const std::string data,
      const bool auditable,
      const symbol token,
      const bool contractpays
    );
    
    ACTION accessgrant(
      const name user, 
      const name contract, 
      const std::string file, 
      const eosio::public_key public_key,
      const symbol token,
      const bool contractpays
    );
    
    ACTION regnode(
      const name owner, 
      const eosio::public_key node_key, 
      const std::string url
    );
    
    ACTION peerappr(
      const name sender, 
      const name owner
    );
    
    ACTION peerdisappr(
      const name sender, 
      const name owner
    );

    ACTION unregnode(
      const name owner
    );
    
    ACTION admunreg(
      const name owner
    );
    
    ACTION setprice(
      const name node,
      const asset price,
      const std::string action
    );
    
    ACTION addcurrency(
      const symbol currency,
      const name contract
    );
    
    ACTION prepare(
      const name user,
      const symbol currency
    );
    
    void transfer(const name from, const name to, const asset quantity, const std::string memo);
    
    void validate_asset(const asset quantity) {
      eosio_assert(quantity.amount > 0, "Deposit amount must be > 0");
      const auto& curr = currencies.get(quantity.symbol.code().raw(), "Currency not accepted");
      
      /* If we are in a notification action that was initiated by 
       * require_recipient in the eosio.token contract, get_code() is the
       * account where the token contract is deployed. So for EOS tokens,
       * that should be the "eosio.token" account.
       * Make sure we're checking that against the known contract account. 
       */
      eosio_assert(curr.contract == get_code(), "We're not so easily fooled");
    }
    
    template<typename T>
    void update_pricefeed(
      const name node, 
      const asset price, 
      const std::string action, 
      T& pricefeeds
    );
    
  private:
    void charge_fee(const name user, const name contract, const asset& fee, const bool contractpays);
    void charge_store_fee(const name user, const name contract, const symbol& token, const bool contractpays);
    void charge_read_fee(const name user, const name contract, const symbol& token, const bool contractpays);

    template<typename T>
    void propagate_price_change(
      const name node, 
      const asset price, 
      const std::string action, 
      T& pricefeeds
    );
    
    template<typename T>
    void update_price_table(
      const name node,
      const asset price,
      T& prices
    );
    

    const asset get_read_fee(symbol currency) {
      const auto price = read_prices.get(currency.code().raw(), "Token not accepted");
      return price.money;
    }
    
    const asset get_store_fee(symbol currency) {
      const auto price = store_prices.get(currency.code().raw(), "Token not accepted");
      return price.money;
    }

    
    void add_balance(name user, asset value) {
      balances_table balances(_self, user.value);
      const auto user_it = balances.find(value.symbol.code().raw());      
      eosio_assert(user_it != balances.end(), "Balance table entry does not exist, call prepare first");
      balances.modify(user_it, user, [&](auto& bal){
          bal.funds += value;
      });
    }
    
    void sub_balance(name user, asset value) {
      if(value.amount == 0) {
        return;
      }
      balances_table balances(_self, user.value);
      const auto& user_balance = balances.get(value.symbol.code().raw(), "User has no balance");
      eosio_assert(user_balance.funds >= value, "Overdrawn balance");
      
      if(user_balance.funds == value) {
        balances.erase(user_balance);
      } else {
        balances.modify(user_balance, user, [&](auto& bal){
            bal.funds -= value;
        });
      }
    }
    
    int64_t median(std::vector<int64_t>& v) {
      const size_t s = v.size();
      if(s == 0) {
        return 0;
      } else if(s == 1) {
        return v[0];
      }    
      std::sort(v.begin(), v.end());
      if(s % 2 == 0) {
        return (v[s/2-1] + v[s/2])/2;
      } else {
        return v[s/2];
      }
    }    
    
    
    void was_approved_by(const name approver, const nodeinfo& node) {
      if(node.is_active) {
        // no point in approving this node if it's already active
        return;
      }
      
      const auto itr = peerapprovals.find(node.owner.value);
      
      /**
        * If no peerapproval table entry exists yet, create one and exit
        */
      if(itr == peerapprovals.end()) {
        peerapprovals.emplace(approver, [&](auto& pa) {
          pa.node = node.owner;
          pa.approved_by.insert(approver);
          pa.created_at = now();
        });
        return;
      } else if(itr->is_expired()) {
        /**
          * If it's expired, erase the old one and start fresh.
          * This is to make sure the other disapprovals are not 
          * from another century.
          */
        peerapprovals.erase(itr);
        peerapprovals.emplace(approver, [&](auto& pa) {
          pa.node = node.owner;
          pa.approved_by.insert(approver);
          pa.created_at = now();
        });
        return;
      }
      
      /**
        * If number of needed approvals is met (including the current one),
        * erase peerapproval from the table and activate node.
        */
      if(itr->approved_by.size() + 1 >= peers_needed()) {
        peerapprovals.erase(itr);
        return activate_node(node);
      }
      
      /**
        * Otherwise, add the approver to the set
        */
      if(itr != peerapprovals.end()) {
        peerapprovals.modify(itr, approver, [&](auto& pa) {
          pa.approved_by.insert(approver);
        });
      }
    }
    
    void was_disapproved_by(const name disapprover, const nodeinfo& node) {
      if(!node.is_active) {
        // no point in disapproving this node if it's already deactivated
        return;
      }
      
      const auto itr = peerdisapprovals.find(node.owner.value);
      
      /**
        * If no peerdisapproval table entry exists yet, create one and exit
        */
      if(itr == peerdisapprovals.end()) {
        peerdisapprovals.emplace(disapprover, [&](auto& pd) {
          pd.node = node.owner;
          pd.disapproved_by.insert(disapprover);
          pd.created_at = now();
        });
        return;
      } else if(itr->is_expired()) {
        /**
          * If it's expired, erase the old one and start fresh.
          * This is to make sure the other disapprovals are not 
          * from another century.
          */
        peerdisapprovals.erase(itr);
        peerdisapprovals.emplace(disapprover, [&](auto& pd) {
          pd.node = node.owner;
          pd.disapproved_by.insert(disapprover);
          pd.created_at = now();
        });
        return;
      }
      
      /**
        * If number of needed disapprovals is met (including the current one),
        * erase peerdisapproval from the table and disable the node.
        */
      if(itr->disapproved_by.size() + 1 >= peers_needed()) {
        peerdisapprovals.erase(itr);
        return disable_node(node);
      }
      
      /**
        * Otherwise, add the disapprover to the set
        */
      if(itr != peerdisapprovals.end()) {
        peerdisapprovals.modify(itr, disapprover, [&](auto& pa) {
          pa.disapproved_by.insert(disapprover);
        });
      }
    }
    
    void activate_node(const nodeinfo& node) {
      const auto node_idx = nodes.find(node.owner.value);
      if(node_idx != nodes.end()) {
        nodes.modify(node_idx, same_payer, [&](auto& info) {
          info.is_active = true;
        });
      }
      
      // if there are any incomplete disapprovals, clear them out
      const auto itr = peerdisapprovals.find(node.owner.value);
      if(itr != peerdisapprovals.end()) {
        peerdisapprovals.erase(itr);
      }
    }
    
    void disable_node(const nodeinfo& node) {
      const auto node_idx = nodes.find(node.owner.value);
      if(node_idx != nodes.end()) {
        nodes.modify(node_idx, same_payer, [&](auto& info) {
          info.is_active = false;
        });
      }
      
      // if there are any incomplete approvals, clear them out
      const auto itr = peerapprovals.find(node.owner.value);
      if(itr != peerapprovals.end()) {
        peerapprovals.erase(itr);
      }
    }
    
    uint32_t peers_needed() {
      uint32_t active_nodes{0};
      for(const auto& node: nodes) {
        if(node.is_active) {
          active_nodes++;
        }
      }
      return active_nodes/2 + 1;
    }
};



