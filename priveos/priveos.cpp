#include "priveos.hpp"

using namespace eosio;

class priveos : public contract {
  public:
    using contract::contract;
    
    priveos(account_name self) : contract(self), nodes(_self, _self) {}

    //@abi action
    void store(const account_name owner, const account_name contract, const std::string file, const std::string data) {
      require_auth(owner);
      // print( "Storing file ", file);
    }
    // 
    // void accessgrant(const account_name user, ) {
    // 
    // }
    
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
      const auto& node = nodes.get( owner, "owner not found." );
      nodes.modify(node, 0, [&](nodeinfo& info) {
        info.is_active = false;
      });
    }
  
  private:
    // @abi table nodes i64
    struct nodeinfo {
      account_name        owner;
      eosio::public_key   node_key;
      std::string              url;
      bool                is_active = true;
      
      uint64_t primary_key()const { return owner; }
      
      EOSLIB_SERIALIZE(nodeinfo, (owner)(node_key)(url)(is_active))
    };
    typedef multi_index<N(nodes), nodeinfo> nodes_table;
    nodes_table nodes;
};

EOSIO_ABI( priveos, (store)(regnode)(unregnode) )
