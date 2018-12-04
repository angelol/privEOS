#include "priveos.hpp"

template<typename T>
void priveos::update_pricefeed(const name node, const asset price, const std::string action, T& pricefeeds) {
  auto itr = pricefeeds.find(node.value);
  if(itr != pricefeeds.end()) {
    pricefeeds.modify(itr, node, [&](auto& pf) {
      pf.price = price;
    });
  } else {
    pricefeeds.emplace(node, [&](auto& pf) {
      pf.node = node;
      pf.price = price;
    });
  }
  update_price(node, price, action, pricefeeds);
}

template<typename T>
void priveos::update_price(const name node, const asset price, const std::string action, T& pricefeeds) {
  std::vector<int64_t> vec;
  for(const auto& pf : pricefeeds) {
    vec.push_back(pf.price.amount);        
  }
  asset median_price = asset{median(vec), price.symbol};  
  if(action == accessgrant_action_name) {
    update_price_table(node, median_price, read_prices);
  } else if(action == store_action_name) {
    update_price_table(node, median_price, store_prices);    
  }
}

template<typename T>
void priveos::update_price_table(const name node, const asset price, T& prices) {
  const auto& itr = prices.find(price.symbol.code().raw());
  if(itr != prices.end()) {
    prices.modify(itr, node, [&](auto& p) {
      p.money = price;
    });
  } else {
    prices.emplace(node, [&](auto& p) {
      p.money = price;
    });
  }
}
