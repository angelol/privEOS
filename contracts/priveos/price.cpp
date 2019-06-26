#include "priveos.hpp"

template<typename T>
void priveos::update_pricefeed(const name node, const asset price, const std::string action, T& pricefeeds) {
  auto itr = pricefeeds.find(node.value);
  print("inserting ", price, " into node ", node);
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
  propagate_price_change(node, price, action, pricefeeds);
}

template<typename T>
void priveos::propagate_price_change(const name node, const asset price, const std::string action, T& pricefeeds) {
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

const asset priveos::get_read_fee(symbol currency) {
  const auto price = read_prices.get(currency.code().raw(), "Token not accepted");
  return price.money;
}

const asset priveos::get_store_fee(symbol currency) {
  const auto price = store_prices.get(currency.code().raw(), "Token not accepted");
  return price.money;
}

void priveos::add_balance(name user, asset value) {
  balances_table balances(_self, user.value);
  const auto user_it = balances.find(value.symbol.code().raw());      
  check(user_it != balances.end(), fmt("Balance table entry does not exist for user {}, call prepare first", user.to_string()));
  balances.modify(user_it, user, [&](auto& bal){
      bal.funds += value;
  });
}

void priveos::sub_balance(name user, asset value) {
  if(value.amount == 0) {
    return;
  }
  balances_table balances(_self, user.value);
  const auto& user_balance = balances.get(value.symbol.code().raw(), fmt("User {} has no balance", user.to_string()));
  check(user_balance.funds >= value, "Overdrawn balance");
  
  if(user_balance.funds == value) {
    balances.erase(user_balance);
  } else {
    balances.modify(user_balance, user, [&](auto& bal){
        bal.funds -= value;
    });
  }
}

int64_t priveos::median(std::vector<int64_t>& v) {
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
