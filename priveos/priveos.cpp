#include "priveos.hpp"

using namespace eosio;
using namespace boost::accumulators;

class priveos : public contract {
  public:
    using contract::contract;
    
    priveos(account_name self) : contract(self), nodes(_self, _self), pricefeeds(_self, _self), prices(_self, _self) {}

    //@abi action
    void store(const account_name owner, const account_name contract, const std::string file, const std::string data) {
      require_auth(owner);
      // print( "Storing file ", file);
    }
    
    //@abi action
    void accessgrant(const account_name user, const account_name contract, const std::string file, const eosio::public_key public_key) {
      require_auth(user);
      require_recipient(contract);
    }
    
    //@abi action
    void regnode(const account_name owner, const eosio::public_key node_key, const std::string url) {
      eosio_assert(node_key != eosio::public_key(), "public key should not be the default value");
      
      require_auth(owner);
      
      auto node_idx = nodes.find(owner);
      if(node_idx != nodes.end()) {
        nodes.modify(node_idx, owner, [&](nodeinfo& info) {
          info.node_key = node_key;
          info.url = url;
          info.is_active = true;
        });
      } else {
        nodes.emplace(owner, [&](nodeinfo& info) {
          info.owner = owner;
          info.node_key = node_key;
          info.url = url;
        });
      }  
    }
    
    //@abi action
    void unregnode(const account_name owner) {
      require_auth(owner);
      const auto& node = nodes.get(owner, "owner not found");
      nodes.modify(node, 0, [&](nodeinfo& info) {
        info.is_active = false;
      });
    }
    
    void update_price(const account_name node, const asset price) {
      accumulator_set<int64_t, features<tag::median>> acc;
      for(const auto& pf : pricefeeds) {
        acc(pf.price.amount);
      }
      const auto m = median(acc);
      asset new_price = asset(m, price.symbol);
      eosio::print(m);
      
      const auto& itr = prices.find(price.symbol);
      if(itr != prices.end()) {
        prices.modify(itr, node, [&](auto& p) {
          p.money = new_price;
        });
      } else {
        prices.emplace(node, [&](auto& p) {
          p.money = new_price;
        });
      }
    }
    
    //@abi action
    void setprice(const account_name node, const asset price) {
      nodes.get(node, "node not found.");
      auto itr = pricefeeds.find(node);
      if(itr != pricefeeds.end()) {
        pricefeeds.modify(itr, node, [&](pricefeed& pf) {
          pf.price = price;
        });
      } else {
        pricefeeds.emplace(node, [&](pricefeed& pf) {
          pf.node = node;
          pf.price = price;
        });
      }
      update_price(node, price);
    }
    

  
  private:
    // @abi table nodes i64
    struct nodeinfo {
      account_name        owner;
      eosio::public_key   node_key;
      std::string         url;
      bool                is_active = true;
      
      uint64_t primary_key()const { return owner; }
      
      EOSLIB_SERIALIZE(nodeinfo, (owner)(node_key)(url)(is_active))
    };
    typedef multi_index<eosio::string_to_name("nodes"), nodeinfo> nodes_table;
    nodes_table nodes;
    
    // @abi table pricefeed i64
    struct pricefeed {
      account_name node;
      asset price;
      uint64_t primary_key() const { return node; }
    };
    typedef multi_index<eosio::string_to_name("pricefeed"), pricefeed> pricefeed_table;
    pricefeed_table pricefeeds;
    
    // @abi table price i64
    struct price {
      asset money;
      uint64_t primary_key() const { return money.symbol; }
    };
    typedef multi_index<eosio::string_to_name("price"), price> price_table;
    price_table prices;
};

// Re-define N because EOSIO_ABI needs it
#define N(X) ::eosio::string_to_name(#X)
EOSIO_ABI( priveos, (store)(accessgrant)(regnode)(unregnode)(setprice) )
