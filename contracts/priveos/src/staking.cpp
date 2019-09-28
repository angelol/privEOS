#include <eosio/eosio.hpp>
#include "eosio.token.hpp"

ACTION priveos::founderstake(const name user, const asset quantity, const uint32_t locked_until) {
  require_auth(get_self());
  free_priveos_balance_sub(quantity);
  add_locked_balance(user, quantity, locked_until);
  consistency_check();
}

ACTION priveos::stake(const name user, const asset quantity) {
  require_auth(user);
  dacrewards_impl(user, quantity.symbol, false);

  free_priveos_balance_sub(quantity);
  add_staked_balance(user, quantity);
  consistency_check();
}

ACTION priveos::unstake(const name user, const asset quantity) {
  require_auth(user);
  dacrewards_impl(user, quantity.symbol, false);
  
  // move from locked to free balance before sending out
  sub_staked_balance(user, quantity);
  free_priveos_balance_add(quantity);
  
  action(
    permission_level{get_self(), "active"_n},
    priveos_token_contract,
    "transfer"_n,
    std::make_tuple(get_self(), user, quantity, std::string("Withdrawal"))
  ).send();
  
}

ACTION priveos::founderunsta(const name user, const asset quantity) {
  require_auth(user);
  dacrewards_impl(user, quantity.symbol, false);

  // move from locked to free balance before sending out
  sub_locked_balance(user, quantity);
  free_priveos_balance_add(quantity);
  
  action(
    permission_level{get_self(), "active"_n},
    priveos_token_contract,
    "transfer"_n,
    std::make_tuple(get_self(), user, quantity, std::string("Withdrawal"))
  ).send();
}

ACTION priveos::delegate(const name user, const asset value) {
  require_auth(get_self());
  free_priveos_balance_sub(value);
  
  auto user_it = delegations.find(user.value);      
  if(user_it == delegations.end()) {
    delegations.emplace(get_self(), [&](auto& bal){
        bal.user = user;
        bal.funds = value;
    });
  } else {
    delegations.modify(user_it, get_self(), [&](auto& bal){
        bal.funds += value;
    });
  }
  
  consistency_check();
}

ACTION priveos::undelegate(const name user, const asset value) {
  require_auth(get_self());
  free_priveos_balance_add(value);
  
  const auto& user_balance = delegations.get(user.value, "User has no balance");
  check(user_balance.funds >= value, "Overdrawn balance");
  
  if(user_balance.funds == value) {
    delegations.erase(user_balance);
  } else {
    delegations.modify(user_balance, user, [&](auto& bal){
        bal.funds -= value;
    });
  }
  
  consistency_check();
} 


void priveos::free_priveos_balance_add(const asset quantity) {
  check(quantity.symbol == priveos_symbol, "PrivEOS: Only PRIVEOS tokens allowed");
  check(quantity.amount > 0, "PrivEOS: Amount must be positive.");
  auto bal = free_balance_singleton.get_or_default(
    freebal {
      .funds = asset{0, priveos_symbol}
    }
  );

  bal.funds += quantity;
  free_balance_singleton.set(bal, get_self());
} 

void priveos::free_priveos_balance_sub(const asset quantity) {
  check(quantity.symbol == priveos_symbol, "PrivEOS: Only PRIVEOS tokens allowed");
  check(quantity.amount > 0, "PrivEOS: Amount must be positive.");
  auto bal = free_balance_singleton.get();
  check(bal.funds >= quantity, "PrivEOS: Trying to overdraw free balance");
  bal.funds -= quantity;
  free_balance_singleton.set(bal, get_self());
}

void priveos::add_staked_balance(const name user, const asset value) {
  check(value.symbol == priveos_symbol, "PrivEOS: Only PRIVEOS tokens allowed");
  auto user_it = staked_balances.find(user.value);      
  if(user_it == staked_balances.end()) {
    staked_balances.emplace(get_self(), [&](auto& bal){
        bal.user = user;
        bal.funds = value;
    });
  } else {
    staked_balances.modify(user_it, get_self(), [&](auto& bal){
        bal.funds += value;
    });
  }
}

void priveos::sub_staked_balance(const name user, const asset value) {
  check(value.symbol == priveos_symbol, "PrivEOS: Only PRIVEOS tokens allowed");
  const auto& user_balance = staked_balances.get(user.value, "PrivEOS: User has no balance");
  check(user_balance.funds >= value, "PrivEOS: Overdrawn balance. User has only %s but is trying to withdraw %s", user_balance.funds, value);
  
  if(user_balance.funds == value) {
    staked_balances.erase(user_balance);
  } else {
    staked_balances.modify(user_balance, user, [&](auto& bal){
        bal.funds -= value;
    });
  }
}

void priveos::add_locked_balance(const name user, const asset value, const uint32_t locked_until) {
  check(value.symbol == priveos_symbol, "PrivEOS: Only PRIVEOS tokens allowed");
  auto user_it = founder_balances.find(user.value);      
  if(user_it == founder_balances.end()) {
    founder_balances.emplace(get_self(), [&](auto& bal){
        bal.founder = user;
        bal.funds = value;
        bal.locked_until = locked_until;
    });
  } else {
    const auto bal = *user_it;
    check(bal.locked_until == locked_until, "PrivEOS: The locked_until values don't match");
    founder_balances.modify(user_it, get_self(), [&](auto& bal){
        bal.funds += value;
    });
  }
}

void priveos::sub_locked_balance(const name user, const asset value) {
  check(value.symbol == priveos_symbol, "PrivEOS: Only PRIVEOS tokens allowed");
  const auto& user_balance = founder_balances.get(user.value, "PrivEOS: User has no balance");
  check(user_balance.locked_until < now(), "PrivEOS: Funds have not yet become unlocked");
  check(user_balance.funds >= value, "PrivEOS: Overdrawn balance. User has only %s but is trying to withdraw %s", user_balance.funds, value);
  
  if(user_balance.funds == value) {
    founder_balances.erase(user_balance);
  } else {
    founder_balances.modify(user_balance, user, [&](auto& bal){
        bal.funds -= value;
    });
  }
}

void priveos::consistency_check() {
  const auto total_balance = eosio::token::get_balance(priveos_token_contract, get_self(), priveos_symbol.code());
  const auto free_balance = free_balance_singleton.get().funds;

  asset founders{0, priveos_symbol};
  for(const auto& x: founder_balances) {
    founders += x.funds;
  }
  
  asset staked{0, priveos_symbol};
  for(const auto& x: staked_balances) {
    staked += x.funds;
  }

  asset delegated{0, priveos_symbol};
  for(const auto& x: delegations) {
    delegated += x.funds;
  }

  /**
    * Make sure the tracked funds match up with the total amount of 
    * privEOS tokens that are deposited. The idea is that the privEOS tokens
    * that are deposited in this DAC contract can belong to either category:
    * 1) Founder Balances
    *    These funds are permanent tokens that belong to
    *    the founders that are locked in until a date in the future. These
    *    tokens count towards the owner's percentage in DAC revenue payout
    *    calculations.
    * 2) Delegations
    *    Tokens of the non-permanent/delegated form that are
    *    delegated to somebody like the DAC service company or BPs. These
    *    tokens count towards the delegatee's percentage in DAC revenue
    *    payout calculations. Unlike permanent tokens, the delegatee only 
    *    has a claim to the revenue payout for as long as those tokens are
    *    delegated to them.
    * 3) Free balance
    *    Tokens that have been deposited into the contract but have
    *    not yet been assigned to any of the above categories.
    *    In the very beginning, the DAC will have a free balance of 
    *    600 PRIVEOS reserved to be delegated to the participating BPs.
    * 4) Staked Balance
    *    PrivEOS tokens that have been staked with this contract in order to 
    *    take part in the revenue distribution.
    */
  check(free_balance + founders + delegated + staked == total_balance, "Inconsistent balances");
}