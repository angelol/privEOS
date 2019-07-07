
void priveos::charge_store_fee(const name& user, const name& contract, const symbol& token, const bool contractpays) {
  const auto fee = get_store_fee(token);
  charge_fee(user, contract, fee, contractpays);
}


void priveos::charge_read_fee(const name& user, const name& contract, const symbol& token, const bool contractpays) {
  const auto fee = get_read_fee(token);
  charge_fee(user, contract, fee, contractpays);
}

void priveos::charge_fee(const name& user, const name& contract, const asset& fee, const bool contractpays) {
  if(fee.amount == 0) {
    return;
  }
  const auto payer = contractpays ? contract: user;
  sub_balance(payer, fee);
  add_fee_balance(fee);
}

void priveos::add_fee_balance(const asset& value) {
  const auto bal_it = feebalances.find(value.symbol.code().raw()); 
  check(bal_it != feebalances.end(), "PrivEOS: Feebalance table entry does not exist for asset {}.", value);
  
  feebalances.modify(bal_it, same_payer, [&](auto& bal){
      bal.funds += value;
      bal.lifetime += value;
  });
}

void priveos::sub_fee_balance(const asset& value) {
  if(value.amount == 0) {
    return;
  }
  const auto bal_it = feebalances.find(value.symbol.code().raw()); 
  check(bal_it != feebalances.end(), "PrivEOS: Feebalance table entry does not exist for asset {}.", value);
  
  check(bal_it->funds >= value, "PrivEOS: Trying to overdraw fee balance.");

  feebalances.modify(bal_it, same_payer, [&](auto& bal){
      bal.funds -= value;
      // bal.lifetime should never be reduced
  });
}