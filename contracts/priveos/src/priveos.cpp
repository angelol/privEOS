#include "price.cpp"
#include "fee.cpp"
#include "peerapprovals.cpp"
#include "staking.cpp"
#include "eosio.token.hpp"
#include "rewards.cpp"

ACTION priveos::init() {
  require_auth(get_self());
  check(!global_singleton.exists(), "PrivEOS: Already initialized");
  
  global_singleton.set(global{
    .unique_files = 0,
    .files = 0,
    .registered_nodes = 0,
    .dac_activated = false,
  }, get_self());
  
  // now delegate 600 tokens to the nodes
  check(!node_delegation_singleton.exists(), "PrivEOS: node_delegation_singleton already exists. This should not be possible");
  const asset delegation_amount{6000000, priveos_symbol};
  node_delegation_singleton.set(nodedelegat{
    .funds = delegation_amount
  }, get_self());
  if(free_balance_singleton.exists()) {
    free_priveos_balance_sub(delegation_amount);
  }
}

ACTION priveos::store(const name owner, const name contract, const std::string file, const std::string data, const bool auditable, const symbol token, const bool contractpays) {
  require_auth(owner);
  ensure_initialized();
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
  ensure_initialized();
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

ACTION priveos::postbond(const name owner, const asset amount) {
  require_auth(owner);
  const auto itr = nodes.find(owner.value);
  check(amount.amount > 0, "PrivEOS: Amount must be positive");
  check(itr != nodes.end(), "PrivEOS: You must register before posting a bond.");
  check(amount.symbol == bond_symbol, "PrivEOS: Wrong currency. Bond must be %s.", bond_symbol);
  
  priveos::sub_balance(owner, amount);
  nodes.modify(itr, same_payer, [&](auto &x) {
    x.bond += amount;
  });
}

ACTION priveos::regnode(const name owner, const public_key node_key, const std::string url) {
  require_auth(owner);
  check(node_key != public_key(), "public key should not be the default value");
  check(node_key.type == 0u, "Only K1 Keys supported");
  check(url.size() <= 256, "url has more than 256 bytes");
#ifndef LOCAL
  check(url.substr(0u, 8u) == "https://"s, "URL parameter must be a valid https URL");
#endif
  
  const auto node_idx = nodes.find(owner.value);
  if(node_idx != nodes.end()) {
    // node already exists
    nodes.modify(node_idx, owner, [&](auto& info) {
      info.node_key = node_key;
      info.url = url;
      info.wants_to_leave = false;
      info.cleared_for_leaving = false;
    });
  } else {
    // we have a new node
    nodes.emplace(owner, [&](auto& info) {
      info.owner = owner;
      info.node_key = node_key;
      info.url = url;
      info.is_active = false;
      info.bond = asset{0, bond_symbol};
    });
    
    auto stats = global_singleton.get();
    stats.registered_nodes += 1u;
    global_singleton.set(stats, get_self());
    
    // allocate memory
    if(nodetoken_balances.find(owner.value) == nodetoken_balances.end()) {
      nodetoken_balances.emplace(owner, [&](auto& x) {
        x.owner = owner;
        x.funds = asset{0, nodetoken_symbol};
      });
    }
    
    // charge registration fee
    sub_balance(owner, node_registration_fee);
    add_fee_balance(node_registration_fee);
  } 
}

ACTION priveos::peerappr(const name sender, const name owner) {
  require_auth(sender);
  check(has_dac_been_activated(), "PrivEOS: Peer approvals will become available once the DAC has activated");

  
  nodes.get(sender.value, "Sender must be a registered node");
  const auto &node = nodes.get(owner.value, "Owner must be a registered node");
  check(is_top_node(node), "You're outside of the top %s", top_nodes);
  was_approved_by(sender, node);
}

ACTION priveos::peerdisappr(const name sender, const name owner) {
  require_auth(sender);
  check(has_dac_been_activated(), "PrivEOS: Peer disapprovals will become available once the DAC has activated");
  
  nodes.get(sender.value, "Sender must be a registered node");
  const auto &node = nodes.get(owner.value, "Owner must be a registered node");
  check(is_top_node(node), "You're outside of the top %s", top_nodes);
  was_disapproved_by(sender, node);
}
    
// starts the process by which a node can leave the system
ACTION priveos::unregnode(const name owner) {
  require_auth(owner);
  const auto itr = nodes.find(owner.value);
  check(itr != nodes.end(), "User %s is not registered as node", owner); 
  const auto node = *itr;

  check(node.wants_to_leave == false, "PrivEOS: Node %s already indicated the wish to leave.", node.owner);
  check(node.cleared_for_leaving == false, "PrivEOS: Node %s is already cleared for leaving.", node.owner);
  
  disable_node(node);
  nodes.modify(itr, same_payer, [&](auto &x) {
    x.wants_to_leave = true;
  });
}

ACTION priveos::approveleave(const name owner) {
  require_auth(get_self());
  const auto itr = nodes.find(owner.value);
  check(itr != nodes.end(), "User %s is not registered as node", owner); 
  const auto node = *itr;
  check(node.wants_to_leave == true, "PrivEOS: Node %s does not want to leave.", node.owner);
  check(node.cleared_for_leaving == false, "PrivEOS: Node %s is already cleared for leaving.", node.owner);
  nodes.modify(itr, same_payer, [&](auto &x) {
    x.cleared_for_leaving = true;
  });
}

ACTION priveos::admactivate(const name owner) {
  require_auth(interim_watchdog_account);
  check(!has_dac_been_activated(), "DAC has already been activated. This action is obsolete.");

  const auto& node = nodes.get(owner.value, "owner not found");  
  activate_node(node);
}

ACTION priveos::admdisable(const name owner) {
  require_auth(interim_watchdog_account);
  check(!has_dac_been_activated(), "DAC has already been activated. This action is obsolete.");

  const auto& node = nodes.get(owner.value, "owner not found");
  disable_node(node);
}

ACTION priveos::setprice(const name node, const asset price, const std::string action) {
  require_auth(node);
  check(price.is_valid(), "PrivEOS: Invalid price");
  check(price.amount >= 0, "Price must be non-negative.");
  
  nodes.get(node.value, "PrivEOS: node not found.");
  currencies.get(price.symbol.code().raw(), "Token not accepted");
  
  if(action == store_action_name) {
    store_pricefeed_table pricefeeds{get_self(), price.symbol.code().raw()};
    update_pricefeed(node, price, action, pricefeeds);    
  } else if(action == accessgrant_action_name) {
    read_pricefeed_table pricefeeds{get_self(), price.symbol.code().raw()};
    update_pricefeed(node, price, action, pricefeeds);
  } else {
    check(false, "Invalid action name");
  }
}

ACTION priveos::admsetprice(const asset price, const std::string action) {
  require_auth(get_self());
  check(!has_dac_been_activated(), "DAC has already been activated. This action is obsolete.");
  check(price.is_valid(), "PrivEOS: Invalid price");
  check(price.amount >= 0, "Price must be non-negative.");
  currencies.get(price.symbol.code().raw(), "Token not accepted");
  
  if(action == store_action_name) {
    update_price_table(get_self(), price, store_prices);
  } else if(action == accessgrant_action_name) {
    update_price_table(get_self(), price, read_prices);
  } else {
    check(false, "Invalid action name");
  }
}


ACTION priveos::addcurrency(const symbol currency, const name contract) {
  require_auth(get_self());
  
  check(currencies.find(currency.code().raw()) == currencies.end(), "PrivEOS: Currency %s already exists.", currency);
  
  /* From now on, we're ready to accept this currency */
  currencies.emplace(get_self(), [&](auto& c) {
    c.currency = currency;
    c.contract = contract;
  });
  
  check(feebalances.find(currency.code().raw()) == feebalances.end(), "PrivEOS: feebalance entry already exists. This should not be possible.");
  
  /* Create an entry in the fee-tracking table */
  feebalances.emplace(get_self(), [&](auto &bal) {
    bal.funds = asset{0, currency};
    bal.lifetime = asset{0, currency};
  });
  
  nodebalances.emplace(get_self(), [&](auto& bal) {
    bal.funds = asset{0, currency};
    bal.lifetime = asset{0, currency};
  });
}

ACTION priveos::prepare(const name user, const symbol currency) {
  require_auth(user);
  balances_table balances(get_self(), user.value);      
  const auto it = balances.find(currency.code().raw());
  if(it == balances.end()) {
    balances.emplace(user, [&](auto& bal){
        bal.funds = asset{0, currency};
    });
  }
}

ACTION priveos::vote(const name dappcontract, std::vector<name> votees) {
  require_auth(dappcontract);
  check(votees.size() <= max_votes, "PrivEOS: Please vote for not more than %s nodes.", max_votes);
    
  const auto min_nodes = get_voting_min_nodes();
  check(votees.size() >= min_nodes, "PrivEOS: You need to vote for at least %s nodes.", min_nodes);
  
  for(const auto& node : votees) {
    check(nodes.find(node.value) != nodes.end(), "PrivEOS: You're trying to vote for %s which is not a registered node.", node);
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
ACTION priveos::dacrewards(const name user, const symbol currency) {
  dacrewards_impl(user, currency);
}

// Nodes can call this to withdraw their share of the fees
ACTION priveos::noderewards(const name user, const symbol currency) {
  noderewards_impl(user, currency);
}

[[eosio::on_notify("*::transfer")]] 
void priveos::transfer(const name from, const name to, const asset quantity, const std::string memo) {
  check(quantity.is_valid(), "PrivEOS: Invalid quantity");
  check(quantity.amount > 0, "PrivEOS: Deposit amount must be > 0");
  check(is_account(from), "PrivEOS: The account %s does not exist.");
  check(memo.size() <= 256, "PrivEOS: memo has more than 256 bytes");
  check(from != to, "cannot transfer to self" );
  
  if (from == get_self() && to != get_self()) {
    if(quantity.symbol == priveos_symbol) {
      check(get_first_receiver() == priveos_token_contract, "PrivEOS: Contract mismatch. Nice try, 1337 haxx0r");
      // somebody is trying to send out PRIVEOS tokens
      // so we need to update our bookkeeping table
      free_priveos_balance_sub(quantity);
    }
    // if this is not PRIVEOS transfer, we're not interested and just ignore it
    return;
  }
  
  if (from == get_self() || to != get_self()) {
    return;
  }
  // below this line only incoming transfers
  
  check(from != get_self() && to == get_self(), "PrivEOS: This part of the code should only respond to incoming transfers.");
  
  if(quantity.symbol == priveos_symbol) {
    /* This is just for PRIVEOS tokens */
    check(get_first_receiver() == priveos_token_contract, "PrivEOS: Sorry, we don't take any fake tokens. Contract should be %s but is %s", priveos_token_contract, get_first_receiver());
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
    check(curr.contract == get_first_receiver(), "PrivEOS: Token contract should be %s but is %s. We're not so easily fooled.", curr.contract, get_first_receiver());
    priveos::add_balance(from, quantity);  
  }
}
