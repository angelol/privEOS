#include <eosiolib/eosio.hpp>

using namespace eosio;

class priveos : public contract {
  public:
      using contract::contract;

      [[eosio::action]]
      void store(const account_name owner, const std::string file, const std::string data) {
        require_auth(owner);
        print( "Storing file ", file);
      }
};

EOSIO_ABI( priveos, (store) )
