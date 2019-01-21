#include "price.cpp"

ACTION priveos::store(const name owner, const name contract, const std::string file, const std::string data, const symbol token, bool auditable) {
  require_auth(owner);
  // print( "Storing file ", file);
  const auto& curr = currencies.get(token.code().raw(), "Token not accepted");
  const auto fee = get_store_fee(token);
  
  if(fee.amount > 0) {
    sub_balance(owner, fee);
    action(
      permission_level{_self, "active"_n},
      curr.contract,
      "transfer"_n,
      std::make_tuple(_self, fee_account, fee, std::string("Fee"))
    ).send();
  }
}
    
ACTION priveos::accessgrant(const name user, const name contract, const std::string file, const public_key public_key, const symbol token) {
  require_auth(user);
  require_recipient(contract);
  
  const auto& curr = currencies.get(token.code().raw(), "Token not accepted");
  const auto fee = get_read_fee(token);
  
  if(fee.amount > 0) {
    sub_balance(user, fee);
    action(
      permission_level{_self, "active"_n},
      curr.contract,
      "transfer"_n,
      std::make_tuple(_self, fee_account, fee, std::string("Fee"))
    ).send();
  }
}
    
ACTION priveos::regnode(const name owner, const public_key node_key, const std::string url) {
  require_auth(owner);

  eosio_assert(node_key != public_key(), "public key should not be the default value");
  eosio_assert(node_key.type == (uint32_t)0, "Only K1 Keys supported");
  eosio_assert(url.substr(0, 8) == std::string("https://"), "URL parameter must be a valid https URL");
  
  const auto node_idx = nodes.find(owner.value);
  if(node_idx != nodes.end()) {
    // node already exists
    nodes.modify(node_idx, owner, [&](auto& info) {
      info.node_key = node_key;
      info.url = url;
    });
  } else {
    // we have a new node
    nodes.emplace(owner, [&](auto& info) {
      info.owner = owner;
      info.node_key = node_key;
      info.url = url;
      info.is_active = false;
    });
  }  
}

ACTION priveos::peerappr(const name sender, const name owner) {
  print("peerapprove: sender: ", sender);
  require_auth(sender);
  
  nodes.get(sender.value, "Sender must be a registered node");
  const auto &node = nodes.get(owner.value, "Owner must be a registered node");
  was_approved_by(sender, node);
}

ACTION priveos::peerdisappr(const name sender, const name owner) {
  require_auth(sender);
  
  nodes.get(sender.value, "Sender must be a registered node");
  const auto &node = nodes.get(owner.value, "Owner must be a registered node");
  was_disapproved_by(sender, node);
}
    
ACTION priveos::unregnode(const name owner) {
  require_auth(owner);
  const auto itr = nodes.find(owner.value);
  nodes.erase(itr);
}

ACTION priveos::admunreg(const name owner) {
  require_auth(_self);
  const auto& node = nodes.get(owner.value, "owner not found");
  nodes.modify(node, same_payer, [&](nodeinfo& info) {
    info.is_active = false;
  });
}

ACTION priveos::setprice(const name node, const asset price, const std::string action) {
  nodes.get(node.value, "node not found.");
  currencies.get(price.symbol.code().raw(), "Token not accepted");
  eosio_assert(price.amount >= 0, "Price must be >= 0");
  
  if(action == store_action_name) {
    store_pricefeed_table pricefeeds(_self, price.symbol.code().raw());
    update_pricefeed(node, price, action, pricefeeds);    
  } else if(action == accessgrant_action_name) {
    read_pricefeed_table pricefeeds(_self, price.symbol.code().raw());
    update_pricefeed(node, price, action, pricefeeds);
  } else {
    eosio_assert(false, "Invalid action name");
  }
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
  const auto it = balances.find(currency.code().raw());
  if(it == balances.end()) {
    balances.emplace(user, [&](auto& bal){
        bal.funds = asset{0, currency};
    });
  }
}


void priveos::transfer(const name from, const name to, const asset quantity, const std::string memo) {
  // only respond to incoming transfers
  if (from == _self || to != _self) {
    return;
  }
  
  validate_asset(quantity);
  add_balance(from, quantity);
}

// EOSIO_DISPATCH( priveos, (store)(accessgrant)(regnode)(unregnode)(setprice)(addcurrency) )



extern "C" {
  [[noreturn]] void apply(uint64_t receiver, uint64_t code, uint64_t action) {
    if (action == "transfer"_n.value && code != receiver) {
      execute_action(eosio::name(receiver), eosio::name(code), &priveos::transfer);
    }
    
    if (code == receiver) {
      switch (action) { 
        EOSIO_DISPATCH_HELPER(priveos, (store)(accessgrant)(regnode)(unregnode)(setprice)(addcurrency)(prepare)(peerappr)(peerdisappr)(admunreg) ) 
      }    
    }
    eosio_exit(0);
    }
}

