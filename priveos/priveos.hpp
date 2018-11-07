/**
 *  @file
 *  @copyright defined in eos/LICENSE.txt
 */
#include <eosiolib/eosio.hpp>
#include <eosiolib/public_key.hpp>
#include <eosiolib/asset.hpp>

int64_t median(std::vector<int64_t>& v) {
  size_t s = v.size();
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