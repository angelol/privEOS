#include "price.cpp"
#include "fee.cpp"
#include "peerapprovals.cpp"
#include "staking.cpp"

ACTION priveos::store(const name owner, const name contract, const std::string file, const std::string data, const bool auditable, const symbol token, const bool contractpays) {
  require_auth(owner);
  check(file.size() <= 256, "file has more than 256 bytes");
  check(data.size() <= 256, "data has more than 256 bytes");
  
  /**
    * We need to notify the app contract because this transaction might charge 
    * a fee to the app. The app can implement validity checks in this 
    * notification as a way to prevent abuse.
    */
  require_recipient(contract);

  charge_store_fee(owner, contract, token, contractpays);
  increment_filecount(contract);
}
    
ACTION priveos::accessgrant(const name user, const name contract, const std::string file, const public_key public_key, const symbol token, const bool contractpays) {
  require_auth(user);
  check(file.size() <= 256, "file has more than 256 bytes");
  
  /**
    * We need to notify the app contract for 2 reasons:
    
    * 1) Because this transaction might charge a fee to the app (see above).
    * 2) The app can decide who gets access to this file in the notification. 
    *    If permission should not be granted to this user, the app contract 
    *    needs to raise an error here.
    * Note that the caller can supply any contract they want. This smart contract
    * does not enforce that the contract is the right contract that the
    * file was stored with. The nodes are checking this off-chain. 
    */
  require_recipient(contract);
    
  charge_read_fee(user, contract, token, contractpays);
}
    
ACTION priveos::regnode(const name owner, const public_key node_key, const std::string url) {
  require_auth(owner);

  check(node_key != public_key(), "public key should not be the default value");
  check(node_key.type == uint32_t{0}, "Only K1 Keys supported");
  check(url.size() <= 256, "url has more than 256 bytes");
#ifndef LOCAL
  check(url.substr(0, 8) == std::string("https://"), "URL parameter must be a valid https URL");
#endif
  
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
    
    auto stats = global_singleton.get_or_default(global {});
    stats.registered_nodes += 1;
    global_singleton.set(stats, _self);
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
  disable_node(*itr);
  nodes.erase(itr);
  
  
  auto stats = global_singleton.get();
  stats.registered_nodes -= 1;
  global_singleton.set(stats, _self);
}

ACTION priveos::admunreg(const name owner) {
  require_auth(_self);
  const auto& node = nodes.get(owner.value, "owner not found");
  nodes.modify(node, same_payer, [&](nodeinfo& info) {
    info.is_active = false;
  });
}

ACTION priveos::setprice(const name node, const asset price, const std::string action) {
  require_auth(node);
  
  nodes.get(node.value, "node not found.");
  currencies.get(price.symbol.code().raw(), "Token not accepted");
  check(price.amount >= 0, "Price must be >= 0");
  
  if(action == store_action_name) {
    store_pricefeed_table pricefeeds(_self, price.symbol.code().raw());
    update_pricefeed(node, price, action, pricefeeds);    
  } else if(action == accessgrant_action_name) {
    read_pricefeed_table pricefeeds(_self, price.symbol.code().raw());
    update_pricefeed(node, price, action, pricefeeds);
  } else {
    check(false, "Invalid action name");
  }
}

ACTION priveos::addcurrency(const symbol currency, const name contract) {
  require_auth(_self);
  
  /* From now on, we're ready to accept this currency */
  currencies.emplace(_self, [&](auto& c) {
    c.currency = currency;
    c.contract = contract;
  });
  
  /* Create an entry in the fee-tracking table */
  feebalances.emplace(_self, [&](auto &bal) {
    bal.funds = asset{0, currency};
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

ACTION priveos::vote(const name dappcontract, std::vector<name> votees) {
  require_auth(dappcontract);
  check(votees.size() <= max_votes, "PrivEOS: Please vote for not more than {} nodes.", max_votes);
    
  const auto min_nodes = get_voting_min_nodes();
  check(votees.size() >= min_nodes, "PrivEOS: You need to vote for at least {} nodes.", min_nodes);
  
  for(const auto& node : votees) {
    check(nodes.find(node.value) != nodes.end(), "PrivEOS: You're trying to vote for {} which is not a registered node.", node);
  }

  std::sort(votees.begin(), votees.end());

  const auto it = voters.find(dappcontract.value);
  if(it == voters.end()) {
    voters.emplace(dappcontract, [&](auto& voterinfo) {
      voterinfo.dappcontract = dappcontract;
      voterinfo.nodes = votees;
      voterinfo.offset = roundrobin_rand(votees.size());
    });
  } else {
    voters.modify(it, dappcontract, [&](auto& voterinfo) {
      voterinfo.dappcontract = dappcontract;
      voterinfo.nodes = votees;
      voterinfo.offset = roundrobin_rand(votees.size());
    });
  }
  
}

// PRIVEOS token holders can call this to withdraw their share of the fees
ACTION priveos::dacrewards(const name user) {
  require_auth(user);
}

// Nodes can call this to withdraw their share of the fees
ACTION priveos::noderewards(const name user) {
  require_auth(user);
  
}

[[eosio::on_notify("*::transfer")]] 
void priveos::transfer(const name from, const name to, const asset quantity, const std::string memo) {
  check(quantity.is_valid(), "PrivEOS: Invalid quantity");
  check(quantity.amount > 0, "PrivEOS: Deposit amount must be > 0");
  check(is_account(from), "PrivEOS: The account {} does not exist.");
  check(memo.size() <= 256, "memo has more than 256 bytes");

  // only respond to incoming transfers
  if (from == _self || to != _self) {
    return;
  }
  
  if(quantity.symbol == priveos_symbol) {
    /* This is just for PRIVEOS tokens */
    check(get_first_receiver() == priveos_token_contract, "PrivEOS: Sorry, we don't take any fake tokens. Contract should be {} but is {}", priveos_token_contract, get_first_receiver());
    free_priveos_balance_add(quantity);    
  } else {
    /* This is for tokens of any kind (e.g. as deposits towards fee payments) */
    
    const auto& curr = currencies.get(quantity.symbol.code().raw(), "PrivEOS: Currency not accepted");
    /* If we are in a notification action that was initiated by 
     * require_recipient in the eosio.token contract,
     * get_first_receiver() is the account where the token contract 
     * is deployed. So for EOS tokens,
     * that should be the "eosio.token" account.
     * Make sure we're checking that against the known contract account. 
     */
    check(curr.contract == get_first_receiver(), "PrivEOS: Token contract should be {} but is {}. We're not so easily fooled.", curr.contract, get_first_receiver());
    add_balance(from, quantity);  
  }
}
