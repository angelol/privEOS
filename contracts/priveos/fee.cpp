

void priveos::charge_fee(const name user, const name contract, const asset& fee, const bool contractpays) {
  if(fee.amount == 0) {
    return;
  }
  const auto payer = contractpays ? contract: user;
  sub_balance(payer, fee);
}

void priveos::charge_store_fee(const name user, const name contract, const symbol& token, const bool contractpays) {
  const auto fee = get_store_fee(token);
  charge_fee(user, contract, fee, contractpays);
}


void priveos::charge_read_fee(const name user, const name contract, const symbol& token, const bool contractpays) {
  const auto fee = get_read_fee(token);
  charge_fee(user, contract, fee, contractpays);
}