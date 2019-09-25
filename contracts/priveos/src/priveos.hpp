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
#include <cmath>

using namespace eosio;

/* eosio::check overload that allows passing a format string for more 
 * helpful error messages.
 */
template<typename... Args>
inline void check(bool pred, const string& format, Args const& ... args) {
  if(!pred) {
    const auto msg = fmt(format, args...);
    check(pred, msg.c_str());    
  }
}

CONTRACT priveos : public eosio::contract {
  using contract::contract;
  public:
    priveos(name self,name code, datastream<const char*> ds) : eosio::contract(self,code,ds),
      free_balance_singleton(get_self(), get_self().value),
      node_delegation_singleton(get_self(), get_self().value),
      founder_balances(get_self(), get_self().value),
      delegations(get_self(), get_self().value),
      feebalances(get_self(), get_self().value),
      nodepay(get_self(), get_self().value),
      nodebalances(get_self(), get_self().value),
      nodetoken_balances(get_self(), get_self().value),
      global_singleton(get_self(), get_self().value),
      voters(get_self(), get_self().value),
      nodes(get_self(), get_self().value), 
      store_prices(get_self(), get_self().value), 
      read_prices(get_self(), get_self().value), 
      currencies(get_self(), get_self().value), 
      peerapprovals(get_self(), get_self().value), 
      peerdisapprovals(get_self(), get_self().value)
      {}
    
    static constexpr symbol priveos_symbol{"PRIVEOS", 4};
    static constexpr symbol nodetoken_symbol{"NODET", 4};

#define STR_EXPAND(tok) #tok
#define STR(tok) STR_EXPAND(tok)
    
#ifdef TOKENCONTRACT // allows specifying the token contract during compile for unittests
    static constexpr name priveos_token_contract{STR(TOKENCONTRACT)};
#else
    static constexpr name priveos_token_contract{"priveostoken"};
#endif
    const std::string accessgrant_action_name{"accessgrant"};
    const std::string store_action_name{"store"};    
    static constexpr uint32_t FIVE_MINUTES{5*60};
    static constexpr uint32_t top_nodes{30};
    static constexpr uint32_t max_votes{top_nodes};
#ifdef WATCHDOG_ACCOUNT
    static constexpr name interim_watchdog_account{STR(WATCHDOG_ACCOUNT)};
#else
    static constexpr name interim_watchdog_account{"slantagpurse"};
#endif

// Make bond amount and currency configurable at compile time
#ifdef BOND_AMOUNT
  #ifdef BOND_SYMBOL
    #ifdef BOND_DIGITS
      #ifdef BOND_TOKEN_CONTRACT
        static constexpr symbol bond_symbol{STR(BOND_SYMBOL), BOND_DIGITS};
        static constexpr name bond_token_contract{STR(BOND_TOKEN_CONTRACT)};
        const asset bond_amount{std::atoll(STR(BOND_AMOUNT)), bond_symbol};
      #else
        #error BOND_TOKEN_CONTRACT required.
      #endif
    #else
      #error BOND_DIGITS required.
    #endif
  #else
    #error BOND_SYMBOL required.
  #endif
#else
  static constexpr symbol bond_symbol{"EOS", 4};
  static constexpr name bond_token_contract{"eosio.token"};
  const asset bond_amount{1000ll*10000ll, bond_symbol}; // 1000.0000 EOS
#endif
#ifdef REGISTRATION_FEE
  const asset node_registration_fee{std::atoll(STR(REGISTRATION_FEE)), bond_symbol};
#else
  const asset node_registration_fee{10ll*10000ll, bond_symbol};
#endif

    /**
      * PRIVEOS TOKEN STAKING (implemented in staking.cpp)
      */
    TABLE freebal {
      asset funds;
    };
    TABLE nodedelegat {
      asset funds;
    };
    using free_balance_table = singleton<"freebal"_n, freebal>;
    free_balance_table free_balance_singleton;
    
    using node_delegation = singleton<"nodedelegat"_n, nodedelegat>;
    node_delegation node_delegation_singleton;
    
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
      
      /**
        * The sum of fees collected since the beginning. Does not decrease
        * when someone withdraws their fee rewards.
        */
      asset lifetime;
      
      uint64_t primary_key() const { return funds.symbol.code().raw(); }
    };
    using feebal_table = multi_index<"feebal"_n, feebal>;
    feebal_table feebalances;
    
    TABLE holderpayinfo {
      time_point    last_claimed_at;
      asset         last_claim_balance;
      name          user; 
      
      uint64_t primary_key() const { return user.value; }
    };
    using holderpay_table = multi_index<"holderpay"_n, holderpayinfo>;
    
    TABLE nodepayinfo {
      time_point    last_claimed_at;
      asset         last_claim_balance;
      
      uint64_t primary_key() const { return last_claim_balance.symbol.code().raw(); }
    };
    using nodepay_table = multi_index<"nodepay"_n, nodepayinfo>;
    nodepay_table nodepay;
    
    TABLE nodewithdraw {
      time_point    last_claimed_at;
      asset         last_claim_balance;
      name          user;
      
      uint64_t primary_key() const { return user.value; }
    };
    using nodewithdraw_table = multi_index<"nodewithdraw"_n, nodewithdraw>;
    
    /* This table holds the fee balance dedicated to the nodes */
    TABLE nodebal {
      asset funds;
      
      /**
        * The sum of fees since the beginning. Never decreases.
        */
      asset lifetime;
      
      uint64_t primary_key()const { return funds.symbol.code().raw(); }
    };
    using nodebal_table = multi_index<"nodebal"_n, nodebal>;
    nodebal_table nodebalances;
    /**
      * Every time a file share is store with a node, this particular node
      * get a token. That token is staked with the priveos contract.
      * This table keeps track of how many tokens each node has staked.
      */
    TABLE nodetokenbal {
      name        owner;
      asset       funds;
      
      uint64_t primary_key() const { return owner.value; }        
    };
      
    typedef multi_index<"nodetokenbal"_n, nodetokenbal> nodetokenbal_table;
    nodetokenbal_table nodetoken_balances;
    
    TABLE global {
      uint64_t unique_files = 0;
      
      /* unique file multiplied by the number of nodes it is stored on 
       * double instead of int due to sampling */
      double files = 0.0;
      
      uint64_t registered_nodes = 0;
      uint64_t active_nodes = 0;
      bool dac_activated = false;
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
      name owner;
      eosio::public_key node_key;
      std::string url;
      bool is_active = false;
      double files = 0.0;
      asset bond;
      bool wants_to_leave = false;
      bool cleared_for_leaving = false;
      
      uint64_t primary_key()const { return owner.value; }
      
      uint64_t by_files_descending()const { 
        const auto files_uint = static_cast<uint64_t>(files); 
        return numeric_limits<uint64_t>::max() - files_uint;
      }
    };
    using nodes_table = multi_index<"nodes"_n, nodeinfo,
      indexed_by< "byfiles"_n, const_mem_fun<nodeinfo, uint64_t,  &nodeinfo::by_files_descending> >
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

    ACTION init();
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
    
    ACTION postbond(
      const name owner, 
      const asset amount
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
    
    ACTION admactivate(const name owner);
    ACTION admdisable(const name owner);
    
    ACTION setprice(
      const name node,
      const asset price,
      const std::string action
    );
    
    ACTION admsetprice(
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
    
    ACTION vote(const name dappcontract, std::vector<name> votees);
    ACTION dacrewards(const name user, const symbol currency);
    ACTION noderewards(const name user, const symbol currency);
    
    void transfer(const name from, const name to, const asset quantity, const std::string memo);
    
    template<typename T>
    void update_pricefeed(const name& node, const asset& price, const std::string& action, T& pricefeeds);
    
  private:
    // price functions
    void charge_fee(const name& user, const name& contract, const asset& fee, const bool contractpays);
    void charge_store_fee(const name& user, const name& contract, const symbol& token, const bool contractpays);
    void charge_read_fee(const name& user, const name& contract, const symbol& token, const bool contractpays);
    template<typename T>
    void propagate_price_change(const name& node, const asset& price, const std::string& action, T& pricefeeds);
    
    template<typename T>
    void update_price_table(const name& node, const asset& price, T& prices);
    
    const asset get_read_fee(const symbol& currency);
    const asset get_store_fee(const symbol& currency);
    void add_balance(const name& user, const asset& value);
    void sub_balance(const name& user, const asset& value);
    void add_fee_balance(const asset& value);
    void sub_fee_balance(const asset& value);

    int64_t median(std::vector<int64_t>& v);
      
    // peeraprovals
    void was_approved_by(const name& approver, const nodeinfo& node);
    void was_disapproved_by(const name& approver, const nodeinfo& node);
    void activate_node(const nodeinfo& node);
    void disable_node(const nodeinfo& node);
    uint32_t peers_needed();
    
    void nodetoken_balance_add(const name &owner, const asset& amount) {
      const auto it = nodetoken_balances.find(owner.value);
      check(amount.amount >= 0, "PrivEOS: Nodetoken amount to be added must be non-negative");
      check(it != nodetoken_balances.end(), "PrivEOS: nodetoken_balances entry does not yet exist for %s", owner);
      nodetoken_balances.modify(it, same_payer, [&](auto &x) {
        x.owner = owner;
        x.funds += amount;
      });
      
    }

    void increment_filecount(const name& dappcontract) {
      const auto voterinfo_it = voters.find(dappcontract.value);
      check(voterinfo_it != voters.end(), "PrivEOS: Contract %s has not voted yet.", dappcontract);
      const auto voterinfo = *voterinfo_it;
      check(voterinfo.nodes.size() <= max_votes, "PrivEOS: It should not have been possible to vote for more than %s nodes but you voted for %s", max_votes, voterinfo.nodes.size());
      
      // update filecount for all nodes involved
      uint32_t step{3};
      double n_files{0.0};
      asset nodet_tokens_added{0, nodetoken_symbol};
      const auto callback = [&](name owner, double sampling_factor) {
        const auto node_idx = nodes.find(owner.value);
        if(node_idx != nodes.end()) {
          const auto node = *node_idx;
          if(node.is_active) {
            nodes.modify(node_idx, same_payer, [&](auto& info) {
              // round this the same way as we are the amount of node tokens
              const auto rounded = std::round(sampling_factor*10000.0)/10000.0;
              info.files += rounded;
              n_files += rounded;
            });
            const asset x{static_cast<int64_t>(std::round(sampling_factor*10000.0)), nodetoken_symbol};
            nodetoken_balance_add(owner, x);
            nodet_tokens_added += x;
          }
        }
      };
      
      const auto offset = sampling<name>(voterinfo.offset, voterinfo.nodes, step, callback);

      // update global file stats
      auto stats = global_singleton.get();
      stats.unique_files += 1;
      stats.files += n_files;
      global_singleton.set(stats, get_self());
      
      voters.modify(voterinfo_it, same_payer, [&](auto& voterinfo) {
        voterinfo.offset = offset;
      });
      
      action(
        permission_level{get_self(), "active"_n},
        priveos_token_contract,
        "issue"_n,
        std::make_tuple(get_self(), nodet_tokens_added, ""s)
      ).send();
      
    }
    
    uint32_t get_voting_min_nodes() const{
      return 3;
    }
    
    /* There is no real randomness anyway, no point in trying to do anything fancy */
    static uint32_t roundrobin_rand(uint32_t m) {
      return now() % m;
    }
    
    static uint32_t now() {
      return current_time_point().sec_since_epoch();
    }
    
    std::vector<nodeinfo> get_top_nodes() const {
      std::vector<nodeinfo> node_list{};
      const auto idx = nodes.template get_index<"byfiles"_n>();
      auto it = idx.begin();
      
      for(uint32_t i{0}; i < top_nodes; i++) {
        if(it == idx.end()) {
          break;
        }
        node_list.push_back(*it);
        it++;
      }
      return node_list;
    }
    
    bool is_top_node(const nodeinfo& node_i) const {
      return is_top_node(node_i.owner);
    }
    
    bool is_top_node(const name& owner) const {
      const auto idx = nodes.template get_index<"byfiles"_n>();
      auto it = idx.begin();
      
      for(uint32_t i{0}; i < top_nodes; i++) {
        if(it == idx.end()) {
          break;
        }
        if(it->owner == owner) {
          return true;
        }
        it++;
      }
      return false;
    }
    
    bool has_dac_been_activated() {
      return global_singleton.get().dac_activated;
    }
    
    void ensure_initialized() {
      check(global_singleton.exists(), "PrivEOS: Must initialize first");
    }
    
};

 

