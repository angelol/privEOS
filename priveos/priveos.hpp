/**
 *  @file
 *  @copyright defined in eos/LICENSE.txt
 */
#include <eosiolib/eosio.hpp>
#include <eosiolib/public_key.hpp>
#include <eosiolib/asset.hpp>
#include <eosiolib/symbol.hpp>

using namespace eosio;

CONTRACT priveos : public eosio::contract {
  using contract::contract;
  public:
    priveos(name self,name code, datastream<const char*> ds) : eosio::contract(self,code,ds), nodes(_self, _self.value), prices(_self, _self.value), currencies(_self, _self.value){}
    
    TABLE nodeinfo {
      name        owner;
      eosio::public_key   node_key;
      std::string         url;
      bool                is_active = true;
      
      uint64_t primary_key()const { return owner.value; }      
    };
    
    TABLE pricefeed {
      name node;
      asset price;
      uint64_t primary_key() const { return node.value; }
    };
    
    TABLE price {
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
    typedef multi_index<"pricefeed"_n, pricefeed> pricefeed_table;
    typedef multi_index<"price"_n, price> price_table;
    typedef multi_index<"balances"_n, balance> balances_table;
    typedef multi_index<"currencies"_n, currency_t> currencies_table;
    
    nodes_table nodes;
    price_table prices;
    currencies_table currencies;
    
    ACTION store(
      const name owner, 
      const name contract, 
      const std::string file, 
      const std::string data
    );
    
    ACTION accessgrant(
      const name user, 
      const name contract, 
      const std::string file, 
      const eosio::public_key public_key
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
      const asset price
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
    
    struct transfer_t {
      name from;
      name to;
      asset quantity;
      const std::string memo;
    };
    
    void validate_asset(priveos::transfer_t transfer, name contract) {
      auto& curr = currencies.get(transfer.quantity.symbol.code().raw(), "Currency not accepted");
      eosio_assert(curr.contract == contract, "We're not so easily fooled");
      print("Curr: ", curr.currency, "contract: ", curr.contract);
    }
    
  private:
    void update_price(
      const name node, 
      const asset price
    );
    

    

    
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



