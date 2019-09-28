// PRIVEOS token holders can call this to withdraw their share of the fees
void priveos::dacrewards_impl(const name user, const symbol currency, const bool raise=true) {
  require_auth(user);
  
  const auto feebalances_itr = feebalances.find(currency.code().raw());
  if(feebalances_itr == feebalances.end()) {
    if(raise) {
      check(false, "PrivEOS: There is no balance found for %s", currency);
    } else {
      return;
    }
  }
  const auto current_lifetime_balance = feebalances_itr->lifetime;
  
  asset last_claim_balance{0, currency};
  holderpay_table holderpay{get_self(), currency.code().raw()};
  const auto it = holderpay.find(user.value);
  if(it != holderpay.end()) {
    last_claim_balance = it->last_claim_balance;
  }
  
  if(current_lifetime_balance <= last_claim_balance) {
    if(raise) {
      check(false, "PrivEOS: There is nothing to withdraw, please try again later.");
    } else {
      return;
    }
  }
  
  const auto whole = current_lifetime_balance - last_claim_balance;
  print_f("Whole amount to withdraw: % ", whole);
  
  /** 
    * determine full balance of user
    * token holdings can consist of either:
    * 1) Locked founder tokens
    * 2) Staked tokens
    * 3) Tokens that have been delegated to the user
    * We have to consider all of the above types.
    * Please note that only staked/locked tokens are eligible for rewards. Simply
    * holding the tokens in your wallet is not enough.
    */
  asset locked_tokens{0, priveos_symbol};
  const auto founderbal_it = founder_balances.find(user.value);
  if(founderbal_it != founder_balances.end()) {
    locked_tokens = founderbal_it->funds;
  }
  print_f("User % has % locked tokens. ", user, locked_tokens);
  asset staked_tokens{0, priveos_symbol};
  const auto stakedbal_it = staked_balances.find(user.value);
  if(stakedbal_it != staked_balances.end()) {
    staked_tokens = stakedbal_it->funds;
  }
  print_f("User % has % staked tokens. ", user, staked_tokens);
  asset delegated_tokens{0, priveos_symbol};
  const auto delegation_it = delegations.find(user.value);
  if(delegation_it != delegations.end()) {
    delegated_tokens = delegation_it->funds;
  }
  
  print_f("User % has % delegated tokens. ");
  
  const auto my_tokens = staked_tokens + locked_tokens + delegated_tokens;
  print_f("That's a total of % tokens. ", my_tokens);

  const auto token_supply = token::get_supply(priveos_token_contract, priveos_symbol.code());
  const auto my_share = static_cast<double>(my_tokens.amount) / static_cast<double>(token_supply.amount);
    
  asset withdrawal_amount{0, currency};
  // static_cast always rounds down, which is exactly what we need
  withdrawal_amount.amount = static_cast<int64_t>(static_cast<double>(whole.amount) * my_share);
  
  if(withdrawal_amount.amount <= 0) {
    if(raise) {
      check(false, "PrivEOS: Withdrawal amount is too small, please try again later.");
    } else {
      return;
    }
  }
  
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
void priveos::noderewards_impl(const name user, const symbol currency, const bool raise=true) {
  require_auth(user);
  nodes.get(user.value, "PrivEOS: User is not a registered node.");

  const auto feebalances_itr = feebalances.find(currency.code().raw());
  if(feebalances_itr == feebalances.end()) {
    if(raise) {
      check(false, "PrivEOS: There is no balance found for %s", currency);
    } else {
      return;
    }
  }
  const auto current_lifetime_balance = feebalances_itr->lifetime;

  asset last_claim_balance{0, currency};
  const auto nodepay_it = nodepay.find(currency.code().raw());
  if(nodepay_it != nodepay.end()) {
    last_claim_balance = nodepay_it->last_claim_balance;
  }
  check(current_lifetime_balance >= last_claim_balance, "PrivEOS: Data Corruption");
  
  const auto whole = current_lifetime_balance - last_claim_balance;
  
  const auto priveos_tokens = node_delegation_singleton.get().funds;
  const auto token_supply = token::get_supply(priveos_token_contract, priveos_symbol.code());
  const auto my_share = static_cast<double>(priveos_tokens.amount) / static_cast<double>(token_supply.amount);
  
  asset withdrawal_amount{0, currency};
  // static_cast always rounds down, which is exactly what we need
  withdrawal_amount.amount = static_cast<int64_t>(static_cast<double>(whole.amount) * my_share);
  
  check(withdrawal_amount.amount >= 0, "PrivEOS: Withdrawal amount is too small, please try again later.");
  sub_fee_balance(withdrawal_amount);
  const auto nodebal_it = nodebalances.find(currency.code().raw());
  nodebalances.modify(nodebal_it, same_payer, [&](auto& x){
    x.funds += withdrawal_amount;
    x.lifetime += withdrawal_amount;
  });

  const auto inserter = [&](auto& x) {
    x.last_claimed_at = current_time_point();
    x.last_claim_balance = current_lifetime_balance;
  };
  if(nodepay_it == nodepay.end()) {
    nodepay.emplace(user, inserter);
  } else {
    nodepay.modify(nodepay_it, user, inserter);
  }
  
  // We have now successfully withdrawn the amount dedicated to the nodes and
  // stored it in the nodebalances table.
  // Next step is to calculate how much this individual node user gets.
  const auto my_nodet_balance = nodetoken_balances.get(user.value).funds;
  const auto nodet_supply = token::get_supply(priveos_token_contract, nodetoken_symbol.code());
  const auto my_nodet_share = static_cast<double>(my_nodet_balance.amount) / static_cast<double>(nodet_supply.amount);
  
  const auto current_withdraw_lifetime_balance = nodebalances.get(currency.code().raw()).lifetime;
  
  asset last_withdraw_balance{0, currency};
  nodewithdraw_table withdraw_t{get_self(), currency.code().raw()};
  const auto withdraw_it = withdraw_t.find(user.value);
  if(withdraw_it != withdraw_t.end()) {
    last_withdraw_balance = withdraw_it->last_claim_balance;
  }
  const auto whole_withdraw = current_withdraw_lifetime_balance - last_withdraw_balance;

  asset my_withdraw_share{0, currency};
  my_withdraw_share.amount = static_cast<int64_t>(static_cast<double>(whole_withdraw.amount) * my_nodet_share);
  
  check(my_withdraw_share.amount > 0, "PrivEOS: The withdrawal amount is too small (%s), please try again later", my_withdraw_share);
  
  const auto withdraw_inserter = [&](auto& x) {
    x.last_claimed_at = current_time_point();
    x.last_claim_balance = current_withdraw_lifetime_balance;
    x.user = user;
  };
  if(withdraw_it == withdraw_t.end()) {
    withdraw_t.emplace(user, withdraw_inserter);
  } else {
    withdraw_t.modify(withdraw_it, user, withdraw_inserter);
  }
  
  nodebalances.modify(nodebal_it, same_payer, [&](auto& x){
    x.funds -= my_withdraw_share;
  });
  const auto token_contract = currencies.get(currency.code().raw()).contract;  
  action(
    permission_level{get_self(), "active"_n},
    token_contract,
    "transfer"_n,
    std::make_tuple(get_self(), user, my_withdraw_share, "Node Rewards"s)
  ).send();
    // check(false, ""s);
}