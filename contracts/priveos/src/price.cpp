#include "priveos.hpp"

template<typename T>
void priveos::update_pricefeed(const name& node, const asset& price, const std::string& action, T& pricefeeds) {
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
void priveos::propagate_price_change(const name& node, const asset& price, const std::string& action, T& pricefeeds) {
  std::vector<int64_t> vec;
  for(const auto& pf : pricefeeds) {
    vec.push_back(pf.price.amount);        
  }
  const auto median_price = asset{median(vec), price.symbol};  
  if(action == accessgrant_action_name) {
    update_price_table(node, median_price, read_prices);
  } else if(action == store_action_name) {
    update_price_table(node, median_price, store_prices);    
  }
}

template<typename T>
void priveos::update_price_table(const name& node, const asset& price, T& prices) {
  check(price.amount >= 0, "PrivEOS: Price must be non-negative.");
  check(price.is_valid(), "PrivEOS: Invalid price");
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

const asset priveos::get_read_fee(const symbol& currency) {
  const auto price = read_prices.get(currency.code().raw(), fmt("PrivEOS: Token {} not accepted", currency));
  return price.money;
}

const asset priveos::get_store_fee(const symbol& currency) {
  const auto price = store_prices.get(currency.code().raw(), fmt("PrivEOS: Token {} not accepted", currency));
  return price.money;
}

void priveos::add_balance(const name& user, const asset& value) {
  balances_table balances(get_self(), user.value);
  const auto user_it = balances.find(value.symbol.code().raw());      
  check(user_it != balances.end(), "PrivEOS: Balance table entry does not exist for user {}, call prepare first", user);
  balances.modify(user_it, user, [&](auto& bal){
      bal.funds += value;
  });
}

void priveos::sub_balance(const name& user, const asset& value) {
  if(value.amount == 0) {
    return;
  }
  balances_table balances(get_self(), user.value);
  const auto& user_balance = balances.get(value.symbol.code().raw(), fmt("PrivEOS: User {} has no balance", user));
  check(user_balance.funds >= value, "PrivEOS: Overdrawn balance");
  
  if(user_balance.funds == value) {
    balances.erase(user_balance);
  } else {
    balances.modify(user_balance, user, [&](auto& bal){
        bal.funds -= value;
    });
  }
}

int64_t priveos::median(std::vector<int64_t>& v) {
  const auto s = v.size();
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
