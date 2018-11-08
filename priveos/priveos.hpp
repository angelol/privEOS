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
    priveos(name self,name code, datastream<const char*> ds) : eosio::contract(self,code,ds), nodes(_self, _self.value), prices(_self, _self.value){}
    
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
    
    
    typedef multi_index<"nodes"_n, nodeinfo> nodes_table;
    typedef multi_index<"pricefeed"_n, pricefeed> pricefeed_table;
    typedef multi_index<"price"_n, price> price_table;
    
    nodes_table nodes;
    price_table prices;
    
    
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
    
    
    
  private:
    void update_price(
      const name node, 
      const asset price
    );
    
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