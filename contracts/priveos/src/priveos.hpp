/**
 *  @file
 *  @copyright defined in eos/LICENSE.txt
 */
#pragma once
#include <eosio/eosio.hpp>
#include <eosio/crypto.hpp>
#include <eosio/asset.hpp>
#include <eosio/symbol.hpp>
#include <eosio/system.hpp>
#include <eosio/singleton.hpp>
#include "string.hpp"
#include "sampling.hpp"

using namespace eosio;

/* eosio::check overload that allows giving a format string for more 
 * helpful error messages.
 */
template<typename... Args>
inline void check(bool pred, const string& format, Args const& ... args) {
  if(!pred) {
    const char* msg = fmt(format, args...);
    check(pred, msg);    
  }
}


CONTRACT priveos : public eosio::contract {
  using contract::contract;
  public:
    priveos(name self,name code, datastream<const char*> ds) : eosio::contract(self,code,ds),
      free_balance_singleton(_self, _self.value),
      founder_balances(_self, _self.value),
      delegations(_self, _self.value),
      feebalances(_self, _self.value),
      global_singleton(_self, _self.value),
      voters(_self, _self.value),
      nodes(_self, _self.value), 
      store_prices(_self, _self.value), 
      read_prices(_self, _self.value), 
      currencies(_self, _self.value), 
      peerapprovals(_self, _self.value), 
      peerdisapprovals(_self, _self.value)
      {}
    
    static constexpr symbol priveos_symbol{"PRIVEOS", 4};
    
#ifdef TOKENCONTRACT // allows specifying the token contract during compile for unittests
#define STR_EXPAND(tok) #tok
#define STR(tok) STR_EXPAND(tok)
    static constexpr name priveos_token_contract{STR(TOKENCONTRACT)};
#else
    static constexpr name priveos_token_contract{"priveostoken"};
#endif
    const std::string accessgrant_action_name{"accessgrant"};
    const std::string store_action_name{"store"};    
    const static uint32_t FIVE_MINUTES{5*60};
    
    /**
      * PRIVEOS TOKEN STAKING (implemented in staking.cpp)
      */
    TABLE freebal {
      asset funds;
    };
    typedef singleton<"freebal"_n, freebal> free_balance_table;
    free_balance_table free_balance_singleton;
    
    TABLE founderbal {
      name        founder;
      asset       funds;
      uint32_t    locked_until; // seconds since unix epoch
      
      uint64_t primary_key() const { return founder.value; }        
    };
      
    typedef multi_index<"founderbal"_n, founderbal> founderbal_table;
    founderbal_table founder_balances;
    
    TABLE delegation {
      name        user;
      asset       funds;
        
      uint64_t primary_key() const { return user.value; }        
    };
    typedef multi_index<"delegation"_n, delegation> delegations_table;
    delegations_table delegations;
    
    ACTION stake(const name user, const asset quantity, const uint32_t locked_until);
    ACTION unstake(const name user, const asset quantity);
    ACTION delegate(const name user, const asset value);
    ACTION undelegate(const name user, const asset value);
    
    void free_priveos_balance_add(const asset quantity);
    void free_priveos_balance_sub(const asset quantity);
    void add_locked_balance(const name user, const asset value, const uint32_t locked_until);
    void sub_locked_balance(const name user, const asset value);
    void consistency_check();
  
    /* END PRIVEOS TOKEN STAKING */
    
    /* All fees that the contract collects get tracked here */
    TABLE feebal {
      asset funds;
      
      uint64_t primary_key() const { return funds.symbol.code().raw(); }
    };
    using feebal_table = multi_index<"feebal"_n, feebal>;
    feebal_table feebalances;
    
    TABLE nodepayinfo {
      time_point    last_claimed_at;
      asset         last_claim_balance; 
    };
    using nodepay_table = multi_index<"nodepay"_n, nodepayinfo>;
    
    TABLE global {
      uint64_t unique_files = 0;
      
      /* unique file multiplied by the number of nodes it is stored on 
       * double instead of int due to sampling */
      double files = 0.0;
      
      uint64_t registered_nodes = 0;
      uint64_t active_nodes = 0;
    };
    using global_table = singleton<"global"_n, global>;
    global_table global_singleton;
    
    TABLE voterinfo {
      name                dappcontract;
      std::vector<name>   nodes;
      uint32_t            offset = 0;
      uint64_t primary_key()const { return dappcontract.value; }
    };
    using voter_table = multi_index<"voters"_n, voterinfo>;
    voter_table voters;
    
    TABLE nodeinfo {
      name        owner;
      eosio::public_key   node_key;
      std::string         url;
      bool                is_active = false;
      double              files = 0.0;
      
      uint64_t primary_key()const { return owner.value; }
      uint64_t by_files()const { return static_cast<uint64_t>(files); }      
    };
    using nodes_table = multi_index<"nodes"_n, nodeinfo,
      indexed_by< "byfiles"_n, const_mem_fun<nodeinfo, uint64_t,  &nodeinfo::by_files> >
    >;
    nodes_table nodes;

    TABLE store_pricefeed {
      name node;
      asset price;
      uint64_t primary_key() const { return node.value; }
    };
    using store_pricefeed_table = multi_index<"storepricef"_n, store_pricefeed>;

    
    TABLE read_pricefeed {
      name node;
      asset price;
      uint64_t primary_key() const { return node.value; }
    };
    using read_pricefeed_table = multi_index<"readpricef"_n, read_pricefeed>;

    /*
     * Price for storing items (charged by the store action)
     */ 
    TABLE storeprice {
      asset money;
      uint64_t primary_key() const { return money.symbol.code().raw(); }
    };
    using storeprice_table = multi_index<"storeprice"_n, storeprice>;
    storeprice_table store_prices;


    /*
     * Price for reading items (charged by the accessgrant action) 
     */ 
    TABLE readprice {
      asset money;
      uint64_t primary_key() const { return money.symbol.code().raw(); }
    };
    using readprice_table = multi_index<"readprice"_n, readprice>;
    readprice_table read_prices;

    
    TABLE balance {
        asset funds;
        uint64_t primary_key() const { return funds.symbol.code().raw(); }        
    };    
    using balances_table = multi_index<"balances"_n, balance>;

    TABLE currency_t {
      symbol currency;
      name contract;
      uint64_t primary_key() const { return currency.code().raw(); }  
    };
    using currencies_table = multi_index<"currencies"_n, currency_t>;
    currencies_table currencies;
    
    TABLE peerapproval {
      name node;
      std::set<name> approved_by;
      uint32_t created_at;
      
      uint64_t primary_key() const { return node.value; } 
      bool is_expired() const { return (now() - created_at) > FIVE_MINUTES; }
    };
    using peerapproval_table = multi_index<"peerapproval"_n, peerapproval>;
    peerapproval_table peerapprovals;
    
    TABLE peerdisapproval {
      name node;
      std::set<name> disapproved_by;
      uint32_t created_at;
      
      uint64_t primary_key() const { return node.value; } 
      bool is_expired() const { return (now() - created_at) > FIVE_MINUTES; }
    };
    using peerdisapproval_table = multi_index<"peerdisappr"_n, peerdisapproval>;
    peerdisapproval_table peerdisapprovals;

    
    ACTION store(
      const name owner, 
      const name contract, 
      const std::string file, 
      const std::string data,
      const bool auditable,
      const symbol token,
      const bool contractpays
    );
    
    ACTION accessgrant(
      const name user, 
      const name contract, 
      const std::string file, 
      const eosio::public_key public_key,
      const symbol token,
      const bool contractpays
    );
    
    ACTION regnode(
      const name owner, 
      const eosio::public_key node_key, 
      const std::string url
    );
    
    ACTION peerappr(
      const name sender, 
      const name owner
    );
    
    ACTION peerdisappr(
      const name sender, 
      const name owner
    );

    ACTION unregnode(
      const name owner
    );
    
    ACTION admunreg(
      const name owner
    );
    
    ACTION setprice(
      const name node,
      const asset price,
      const std::string action
    );
    
    ACTION addcurrency(
      const symbol currency,
      const name contract
    );
    
    ACTION prepare(
      const name user,
      const symbol currency
    );
    
    ACTION vote(const name dappcontract, std::vector<name> nodes);
    ACTION claimrewards(const name owner);
    
    void transfer(const name from, const name to, const asset quantity, const std::string memo);
    
    template<typename T>
    void update_pricefeed(const name node, const asset price, const std::string action, T& pricefeeds);
    
  private:
    // price functions
    void charge_fee(const name user, const name contract, const asset& fee, const bool contractpays);
    void charge_store_fee(const name user, const name contract, const symbol& token, const bool contractpays);
    void charge_read_fee(const name user, const name contract, const symbol& token, const bool contractpays);
    template<typename T>
    void propagate_price_change(const name& node, const asset& price, const std::string& action, T& pricefeeds);
    
    template<typename T>
    void update_price_table(const name& node, const asset& price, T& prices);
    
    const asset get_read_fee(const symbol& currency);
    const asset get_store_fee(const symbol& currency);
    void add_balance(const name& user, const asset& value);
    void sub_balance(const name& user, const asset& value);
    void add_fee_balance(asset value);
    int64_t median(std::vector<int64_t>& v);
      
    // peeraprovals
    void was_approved_by(const name& approver, const nodeinfo& node);
    void was_disapproved_by(const name& approver, const nodeinfo& node);
    void activate_node(const nodeinfo& node);
    void disable_node(const nodeinfo& node);
    uint32_t peers_needed();

    void increment_filecount(const name& dappcontract) {
      const auto voterinfo_it = voters.find(dappcontract.value);
      check(voterinfo_it != voters.end(), "PrivEOS: Contract {} has not voted yet.", dappcontract);
      const auto voterinfo = *voterinfo_it;
      
      // update filecount for all nodes involved
      uint32_t step{3};
      double n_files{0.0};
      const auto callback = [&](name owner, double sampling_factor) {
        const auto node_idx = nodes.find(owner.value);
        if(node_idx != nodes.end()) {
          const auto node = *node_idx;
          if(node.is_active) {
            nodes.modify(node_idx, same_payer, [&](auto& info) {
              // print_f("Incrementing file count % by %", info.owner, sampling_factor);
              info.files += sampling_factor;
              n_files += sampling_factor;
            });
          }
        }
      };
      
      const auto offset = sampling<name>(voterinfo.offset, voterinfo.nodes, step, callback);

      // update global file stats
      auto stats = global_singleton.get_or_default(global {});
      stats.unique_files += 1;
      stats.files += n_files;
      global_singleton.set(stats, _self);
      
      voters.modify(voterinfo_it, same_payer, [&](auto& voterinfo) {
        voterinfo.offset = offset;
      });
    }
    
    const uint32_t max_votes{30};
    uint32_t get_voting_min_nodes() {
      return 3;
    }
    
    /* There is no real randomness anyway, no point in trying to do anything fancy */
    static uint32_t roundrobin_rand(uint32_t m) {
      return now() % m;
    }
    
    static uint32_t now() {
      return current_time_point().sec_since_epoch();
    }
};

 

