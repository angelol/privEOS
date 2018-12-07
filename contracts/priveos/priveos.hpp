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
    priveos(name self,name code, datastream<const char*> ds) : eosio::contract(self,code,ds), nodes(_self, _self.value), read_prices(_self, _self.value), store_prices(_self, _self.value), currencies(_self, _self.value){}
    
    const name fee_account{"priveosxfees"};
    const std::string accessgrant_action_name{"accessgrant"};
    const std::string store_action_name{"store"};    
    
    TABLE nodeinfo {
      name        owner;
      eosio::public_key   node_key;
      std::string         url;
      bool                is_active = true;
      
      uint64_t primary_key()const { return owner.value; }      
    };
    
    TABLE store_pricefeed {
      name node;
      asset price;
      uint64_t primary_key() const { return node.value; }
    };
    
    TABLE read_pricefeed {
      name node;
      asset price;
      uint64_t primary_key() const { return node.value; }
    };

    /*
     * Price for storing items (charged by the store action)
     */ 
    TABLE storeprice {
      asset money;
      uint64_t primary_key() const { return money.symbol.code().raw(); }
    };

    /*
     * Price for reading items (charged by the accessgrant action) 
     */ 
    TABLE readprice {
      asset money;
      uint64_t primary_key() const { return money.symbol.code().raw(); }
    };
    
    TABLE balance {
        asset funds;
        uint64_t primary_key() const { return funds.symbol.code().raw(); }        
    };    
    
    TABLE currency_t {
      symbol currency;
      name contract;
      uint64_t primary_key() const { return currency.code().raw(); }  
    };
    
    typedef multi_index<"nodes"_n, nodeinfo> nodes_table;
    
    typedef multi_index<"storepricef"_n, store_pricefeed> store_pricefeed_table;
    typedef multi_index<"readpricef"_n, read_pricefeed> read_pricefeed_table;
    
    typedef multi_index<"readprice"_n, readprice> readprice_table;
    typedef multi_index<"storeprice"_n, storeprice> storeprice_table;
    
    typedef multi_index<"balances"_n, balance> balances_table;
    typedef multi_index<"currencies"_n, currency_t> currencies_table;
    
    nodes_table nodes;
    readprice_table read_prices;
    storeprice_table store_prices;
    currencies_table currencies;
    
    ACTION store(
      const name owner, 
      const name contract, 
      const std::string file, 
      const std::string data,
      const symbol token,
      bool auditable
    );
    
    ACTION accessgrant(
      const name user, 
      const name contract, 
      const std::string file, 
      const eosio::public_key public_key,
      const symbol token
    );
    
    ACTION regnode(
      const name owner, 
      const eosio::public_key node_key, 
      const std::string url
    );
    
    ACTION unregnode(
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
      auto& curr = currencies.get(quantity.symbol.code().raw(), "Currency not accepted");
      
      /* If we are in a notification action that was initiated by 
       * require_recipient in the eosio.token contract, get_code() is the
       * account where the token contract is deployed. So for EOS tokens,
       * that should be the "eosio.token" account.
       * Make sure we're checking that against the known contract account. 
       */
      eosio_assert(curr.contract == get_code(), "We're not so easily fooled");
      print("Curr: ", curr.currency, "contract: ", curr.contract);
    }
    
    template<typename T>
    void update_pricefeed(
      const name node, 
      const asset price, 
      const std::string action, 
      T& pricefeeds
    );
    
  private:
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
      auto itr = read_prices.find(currency.code().raw());
      if(itr != read_prices.end()) {
        return itr->money;
      } else {
        return asset{0, currency};
      }
    }
    
    const asset get_store_fee(symbol currency) {
      auto itr = store_prices.find(currency.code().raw());
      if(itr != store_prices.end()) {
        return itr->money;
      } else {
        return asset{0, currency};
      }    
    }

    
    void add_balance(name user, asset value) {
      balances_table balances(_self, user.value);
      auto user_it = balances.find(value.symbol.code().raw());      
      eosio_assert(user_it != balances.end(), "Balance table entry does not exist, call prepare first");
      balances.modify(user_it, user, [&](auto& bal){
          bal.funds += value;
      });
    }
    
    void sub_balance(name user, asset value) {
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
      size_t s = v.size();
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
};



