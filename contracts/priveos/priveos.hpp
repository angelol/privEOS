/**
 *  @file
 *  @copyright defined in eos/LICENSE.txt
 */
#pragma once
#include <eosio/eosio.hpp>
#include <eosio/crypto.hpp>
#include <eosio/asset.hpp>
#include <eosio/symbol.hpp>
#include <eosio/system.hpp>
#include "string.hpp"

using namespace eosio;

CONTRACT priveos : public eosio::contract {
  using contract::contract;
  public:
    priveos(name self,name code, datastream<const char*> ds) : eosio::contract(self,code,ds), nodes(_self, _self.value), read_prices(_self, _self.value), store_prices(_self, _self.value), currencies(_self, _self.value), peerapprovals(_self, _self.value), peerdisapprovals(_self, _self.value){}
    
    const std::string accessgrant_action_name{"accessgrant"};
    const std::string store_action_name{"store"};    
    const static uint32_t FIVE_MINUTES{5*60};
    
    
    TABLE nodeinfo {
      name        owner;
      eosio::public_key   node_key;
      std::string         url;
      bool                is_active = false;
      uint64_t            files = 0;
      
      uint64_t primary_key()const { return owner.value; }
      uint64_t by_files()const { return files; }      
    };
    using nodes_table = multi_index<"nodes"_n, nodeinfo,
      indexed_by< "byfiles"_n, const_mem_fun<nodeinfo, uint64_t,  &nodeinfo::by_files> >
    >;
    nodes_table nodes;

    TABLE store_pricefeed {
      name node;
      asset price;
      uint64_t primary_key() const { return node.value; }
    };
    using store_pricefeed_table = multi_index<"storepricef"_n, store_pricefeed>;

    
    TABLE read_pricefeed {
      name node;
      asset price;
      uint64_t primary_key() const { return node.value; }
    };
    using read_pricefeed_table = multi_index<"readpricef"_n, read_pricefeed>;

    /*
     * Price for storing items (charged by the store action)
     */ 
    TABLE storeprice {
      asset money;
      uint64_t primary_key() const { return money.symbol.code().raw(); }
    };
    using storeprice_table = multi_index<"storeprice"_n, storeprice>;
    storeprice_table store_prices;


    /*
     * Price for reading items (charged by the accessgrant action) 
     */ 
    TABLE readprice {
      asset money;
      uint64_t primary_key() const { return money.symbol.code().raw(); }
    };
    using readprice_table = multi_index<"readprice"_n, readprice>;
    readprice_table read_prices;

    
    TABLE balance {
        asset funds;
        uint64_t primary_key() const { return funds.symbol.code().raw(); }        
    };    
    using balances_table = multi_index<"balances"_n, balance>;

    TABLE currency_t {
      symbol currency;
      name contract;
      uint64_t primary_key() const { return currency.code().raw(); }  
    };
    using currencies_table = multi_index<"currencies"_n, currency_t>;
    currencies_table currencies;
    
    TABLE peerapproval {
      name node;
      std::set<name> approved_by;
      uint32_t created_at;
      
      uint64_t primary_key() const { return node.value; } 
      bool is_expired() const { return (now() - created_at) > FIVE_MINUTES; }
    };
    using peerapproval_table = multi_index<"peerapproval"_n, peerapproval>;
    peerapproval_table peerapprovals;
    
    TABLE peerdisapproval {
      name node;
      std::set<name> disapproved_by;
      uint32_t created_at;
      
      uint64_t primary_key() const { return node.value; } 
      bool is_expired() const { return (now() - created_at) > FIVE_MINUTES; }
    };
    using peerdisapproval_table = multi_index<"peerdisappr"_n, peerdisapproval>;
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
      check(quantity.amount > 0, "Deposit amount must be > 0");
      const auto& curr = currencies.get(quantity.symbol.code().raw(), "Currency not accepted");
      
      /* If we are in a notification action that was initiated by 
       * require_recipient in the eosio.token contract,
       * get_first_receiver() is the account where the token contract 
       * is deployed. So for EOS tokens,
       * that should be the "eosio.token" account.
       * Make sure we're checking that against the known contract account. 
       */
      check(curr.contract == get_first_receiver(), "We're not so easily fooled");
    }
    
    template<typename T>
    void update_pricefeed(
      const name node, 
      const asset price, 
      const std::string action, 
      T& pricefeeds
    );
    
  private:
    // price functions
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
    const asset get_read_fee(symbol currency);
    const asset get_store_fee(symbol currency);
    void add_balance(name user, asset value);
    void sub_balance(name user, asset value);
    int64_t median(std::vector<int64_t>& v);
      
    // peeraprovals
    void was_approved_by(const name approver, const priveos::nodeinfo& node);
    void was_disapproved_by(const name approver, const priveos::nodeinfo& node);
    void activate_node(const nodeinfo& node);
    void disable_node(const nodeinfo& node);
    uint32_t peers_needed();

    
    
    
    static uint32_t now() {
      return current_time_point().sec_since_epoch();
    }
};



