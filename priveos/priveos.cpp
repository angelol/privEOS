#include "priveos.hpp"

// using namespace eosio;
ACTION priveos::store(const name owner, const name contract, const std::string file, const std::string data) {
  require_auth(owner);
  // print( "Storing file ", file);
}
    
ACTION priveos::accessgrant(const name user, const name contract, const std::string file, const eosio::public_key public_key) {
  require_auth(user);
  require_recipient(contract);
}
    
ACTION priveos::regnode(const name owner, const eosio::public_key node_key, const std::string url) {
  eosio_assert(node_key != eosio::public_key(), "public key should not be the default value");
  
  require_auth(owner);
  
  auto node_idx = nodes.find(owner.value);
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
    
ACTION priveos::unregnode(const name owner) {
  require_auth(owner);
  const auto& node = nodes.get(owner.value, "owner not found");
  nodes.modify(node, eosio::same_payer, [&](nodeinfo& info) {
    info.is_active = false;
  });
}

ACTION priveos::setprice(const name node, const asset price) {
  nodes.get(node.value, "node not found.");
  pricefeed_table pricefeeds(_self, price.symbol.code().raw());
  auto itr = pricefeeds.find(node.value);
  
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

void priveos::update_price(const name node, const asset price) {
  pricefeed_table pricefeeds(_self, price.symbol.code().raw());
  std::vector<int64_t> vec;
  for(const auto& pf : pricefeeds) {
    vec.push_back(pf.price.amount);        
  }
  asset median_price = asset{median(vec), price.symbol};      
  const auto& itr = prices.find(price.symbol.code().raw());
  if(itr != prices.end()) {
    prices.modify(itr, node, [&](auto& p) {
      p.money = median_price;
    });
  } else {
    prices.emplace(node, [&](auto& p) {
      p.money = median_price;
    });
  }
}


EOSIO_DISPATCH( priveos, (store)(accessgrant)(regnode)(unregnode)(setprice) )
