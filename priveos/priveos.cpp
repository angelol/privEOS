#include "priveos.hpp"

ACTION priveos::store(const name owner, const name contract, const std::string file, const std::string data) {
  require_auth(owner);
  // print( "Storing file ", file);
}
    
ACTION priveos::accessgrant(const name user, const name contract, const std::string file, const public_key public_key, const symbol token) {
  require_auth(user);
  require_recipient(contract);
  
  auto& curr = currencies.get(token.code().raw(), "Token not accepted");
  const auto fee = get_fee(token);
  
  sub_balance(user, fee);
  action(
    permission_level{_self, "active"_n},
    curr.contract,
    "transfer"_n,
    std::make_tuple(_self, fee_account, fee, std::string("Fee"))
  ).send();
}
    
ACTION priveos::regnode(const name owner, const public_key node_key, const std::string url) {
  eosio_assert(node_key != public_key(), "public key should not be the default value");
  
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
  nodes.modify(node, same_payer, [&](nodeinfo& info) {
    info.is_active = false;
  });
}

ACTION priveos::setprice(const name node, const asset price) {
  nodes.get(node.value, "node not found.");
  currencies.get(price.symbol.code().raw(), "Token not accepted");
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

ACTION priveos::addcurrency(const symbol currency, const name contract) {
  require_auth(_self);
  currencies.emplace(_self, [&](auto& c) {
    c.currency = currency;
    c.contract = contract;
  });
}

ACTION priveos::prepare(const name user, const symbol currency) {
  require_auth(user);
  balances_table balances(_self, user.value);      
  auto it = balances.find(currency.code().raw());
  if(it == balances.end()) {
    balances.emplace(user, [&](auto& bal){
        bal.funds = asset{0, currency};
    });
  }
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

void priveos::transfer(const name from, const name to, const asset quantity, const std::string memo) {
  // only respond to incoming transfers
  if (from == _self || to != _self) {
    return;
  }
  add_balance(from, quantity);
}

// EOSIO_DISPATCH( priveos, (store)(accessgrant)(regnode)(unregnode)(setprice)(addcurrency) )

datastream<const char*> get_stream(name self, name code) {
  size_t size = action_data_size();

  //using malloc/free here potentially is not exception-safe, although WASM doesn't support exceptions
  constexpr size_t max_stack_buffer_size = 512;
  void* buffer = nullptr;
  if( size > 0 ) {
     buffer = max_stack_buffer_size < size ? malloc(size) : alloca(size);
     read_action_data( buffer, size );
  }
  
  datastream<const char*> ds((char*)buffer, size);
  return ds;
}

extern "C" {
  [[noreturn]] void apply(uint64_t receiver, uint64_t code, uint64_t action) {
    if (action == "transfer"_n.value && code != receiver) {
      priveos thiscontract(name(receiver), name(code), get_stream(name(receiver), name(code)));
      const auto transfer = unpack_action_data<priveos::transfer_t>();
      thiscontract.validate_asset(transfer, name(code));
      thiscontract.transfer(transfer.from, transfer.to, transfer.quantity, transfer.memo);
    }
    
    if (code == receiver) {
      switch (action) { 
        EOSIO_DISPATCH_HELPER(priveos, (store)(accessgrant)(regnode)(unregnode)(setprice)(addcurrency)(prepare) ) 
      }    
    }
    eosio_exit(0);
    }
}

