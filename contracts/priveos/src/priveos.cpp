#include "price.cpp"
#include "fee.cpp"
#include "peerapprovals.cpp"
#include "staking.cpp"
#include "eosio.token.hpp"

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
  const auto delegation_amount = asset{6000000, priveos_symbol};
  node_delegation_singleton.set(nodedelegat{
    .funds = delegation_amount
  }, get_self());
  
  free_priveos_balance_sub(delegation_amount);
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
    });
  } else {
    // we have a new node
    nodes.emplace(owner, [&](auto& info) {
      info.owner = owner;
      info.node_key = node_key;
      info.url = url;
      info.is_active = false;
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
  }  
}

ACTION priveos::peerappr(const name sender, const name owner) {
  print("peerapprove: sender: ", sender);
  require_auth(sender);
  
  nodes.get(sender.value, "Sender must be a registered node");
  const auto &node = nodes.get(owner.value, "Owner must be a registered node");
  check(is_top_node(node), "You're outside of the top %s", top_nodes);
  was_approved_by(sender, node);
}

ACTION priveos::peerdisappr(const name sender, const name owner) {
  require_auth(sender);
  
  nodes.get(sender.value, "Sender must be a registered node");
  const auto &node = nodes.get(owner.value, "Owner must be a registered node");
  check(is_top_node(node), "You're outside of the top %s", top_nodes);
  was_disapproved_by(sender, node);
}
    
ACTION priveos::unregnode(const name owner) {
  require_auth(owner);
  const auto itr = nodes.find(owner.value);
  check(itr != nodes.end(), "User %s is not registered as node", owner); 
  disable_node(*itr);
  nodes.erase(itr);
  
  
  auto stats = global_singleton.get();
  stats.registered_nodes -= 1u;
  global_singleton.set(stats, get_self());
}

ACTION priveos::admunreg(const name owner) {
  require_auth(get_self());
  const auto& node = nodes.get(owner.value, "owner not found");
  nodes.modify(node, same_payer, [&](nodeinfo& info) {
    info.is_active = false;
  });
}

ACTION priveos::setprice(const name node, const asset price, const std::string action) {
  require_auth(node);
  check(price.is_valid(), "PrivEOS: Invalid price");
  check(price.amount >= 0, "Price must be non-negative.");
  
  nodes.get(node.value, "node not found.");
  check(is_top_node(node), "You're outside of the top %s", top_nodes);
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
  require_auth(user);
  
  const auto current_lifetime_balance = feebalances.get(currency.code().raw(), fmt("PrivEOS: There is no balance found for %s", currency).c_str()).lifetime;
  
  print_f("current_lifetime_balance: % ", current_lifetime_balance);
  asset last_claim_balance{0, currency};
  holderpay_table holderpay{get_self(), currency.code().raw()};
  const auto it = holderpay.find(user.value);
  if(it != holderpay.end()) {
    last_claim_balance = it->last_claim_balance;
  }
  print_f("last_claim_balance: % ", last_claim_balance);
  
  check(current_lifetime_balance > last_claim_balance, "PrivEOS: There is nothing to withdraw, please try again later.");
  
  const auto whole = current_lifetime_balance - last_claim_balance;
  print_f("whole: % ", whole);
  
  /** 
    * determine full balance of user
    * token holdings can consist of either:
    * 1) Staked tokens
    * 2) Tokens the user holds in his account
    * 3) Tokens that have been delegated to the user
    * We have to consider all of the above types.
    */
  asset staked_tokens{0, priveos_symbol};
  const auto founderbal_it = founder_balances.find(user.value);
  if(founderbal_it != founder_balances.end()) {
    staked_tokens = founderbal_it->funds;
  }
  print_f("staked_tokens: % ", staked_tokens);
  const auto held_tokens = token::get_balance(priveos_token_contract, user, priveos_symbol);
  print_f("held_tokens: % ", held_tokens);
  asset delegated_tokens{0, priveos_symbol};
  const auto delegation_it = delegations.find(user.value);
  if(delegation_it != delegations.end()) {
    delegated_tokens = delegation_it->funds;
  }
  const auto my_tokens = staked_tokens + held_tokens + delegated_tokens;
  print_f("my_tokens: % ", my_tokens);
  const auto token_supply = token::get_supply(priveos_token_contract, priveos_symbol.code());
  print_f("token_supply: % ", token_supply);
  const auto my_share = static_cast<double>(my_tokens.amount) / static_cast<double>(token_supply.amount);
  print_f("my_share: % ", my_share);
    
  asset withdrawal_amount{0, currency};
  // static_cast always rounds down, which is exactly what we need
  withdrawal_amount.amount = static_cast<int64_t>(static_cast<double>(whole.amount) * my_share);
  print_f("withdrawal_amount: % ", withdrawal_amount);
  
  check(withdrawal_amount.amount > 0, "PrivEOS: Withdrawal amount is too small, please try again later.");
  
  sub_fee_balance(withdrawal_amount);
  
  const auto holderpay_it = holderpay.find(user.value);
  const auto inserter = [&](auto& x) {
    x.last_claimed_at = current_time_point();
    x.last_claim_balance = current_lifetime_balance;
    x.user = user;
  };
  if(holderpay_it == holderpay.end()) {
    holderpay.emplace(user, inserter);
  } else {
    holderpay.modify(holderpay_it, user, inserter);
  }

  const auto token_contract = currencies.get(currency.code().raw()).contract;  
  action(
    permission_level{get_self(), "active"_n},
    token_contract,
    "transfer"_n,
    std::make_tuple(get_self(), user, withdrawal_amount, "DAC Rewards"s)
  ).send();

}

// Nodes can call this to withdraw their share of the fees
ACTION priveos::noderewards(const name user, const symbol currency) {
  require_auth(user);
  
}

ACTION priveos::test(const name owner) {
  asset x{0, priveos_symbol};
  x.set_amount(asset::max_amount);
  print_f("Asset: %\n" , x);
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
    add_balance(from, quantity);  
  }
}
