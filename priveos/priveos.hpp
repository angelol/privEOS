/**
 *  @file
 *  @copyright defined in eos/LICENSE.txt
 */
#include <eosiolib/eosio.hpp>
#include <eosiolib/public_key.hpp>
#include <eosiolib/asset.hpp>

// Undefine N due to conflict with boost
#undef N
#include <boost/accumulators/accumulators.hpp>
#include <boost/accumulators/statistics.hpp>