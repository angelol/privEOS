
void priveos::was_approved_by(const name& approver, const nodeinfo& node) {
  if(node.is_active) {
    // no point in approving this node if it's already active
    return;
  }
  
  auto itr = peerapprovals.find(node.owner.value);
  
  /**
    * If no peerapproval table entry exists yet, create one and exit
    */
  if(itr == peerapprovals.end()) {
    peerapprovals.emplace(approver, [&](auto& pa) {
      pa.node = node.owner;
      pa.approved_by.insert(approver);
      pa.created_at = now();
    });
  } else if(itr->is_expired()) {
    /**
      * If it's expired, erase the old one and start fresh.
      * This is to make sure the other disapprovals are not 
      * from another century.
      */
    peerapprovals.erase(itr);
    peerapprovals.emplace(approver, [&](auto& pa) {
      pa.node = node.owner;
      pa.approved_by.insert(approver);
      pa.created_at = now();
    });
  }
    
  itr = peerapprovals.find(node.owner.value);
  check(itr != peerapprovals.end(), "We just created a peeraproval, so it should be there");

  peerapprovals.modify(itr, approver, [&](auto& pa) {
    pa.approved_by.insert(approver);
  });
  
  itr = peerapprovals.find(node.owner.value);
  check(itr != peerapprovals.end(), "We just created a peeraproval, so it should be there");
  
  /**
    * If number of needed approvals is met (including the current one),
    * erase peerapproval from the table and activate node.
    */
  if(itr->approved_by.size() >= peers_needed()) {
    peerapprovals.erase(itr);
    return activate_node(node);
  }
}

void priveos::was_disapproved_by(const name& disapprover, const nodeinfo& node) {
  if(!node.is_active) {
    // no point in disapproving this node if it's already deactivated
    return;
  }
  
  auto itr = peerdisapprovals.find(node.owner.value);
  
  /**
    * If no peerdisapproval table entry exists yet, create one and exit
    */
  if(itr == peerdisapprovals.end()) {
    peerdisapprovals.emplace(disapprover, [&](auto& pd) {
      pd.node = node.owner;
      pd.disapproved_by.insert(disapprover);
      pd.created_at = now();
    });
  } else if(itr->is_expired()) {
    /**
      * If it's expired, erase the old one and start fresh.
      * This is to make sure the other disapprovals are not 
      * from another century.
      */
    peerdisapprovals.erase(itr);
    peerdisapprovals.emplace(disapprover, [&](auto& pd) {
      pd.node = node.owner;
      pd.disapproved_by.insert(disapprover);
      pd.created_at = now();
    });
  }
  
  itr = peerdisapprovals.find(node.owner.value);
  check(itr != peerdisapprovals.end(), "We just added a disapproval, so it should be here.");
  peerdisapprovals.modify(itr, disapprover, [&](auto& pa) {
    pa.disapproved_by.insert(disapprover);
  });
  
  itr = peerdisapprovals.find(node.owner.value);
  check(itr != peerdisapprovals.end(), "We just added a disapproval, so it should be here.");
  /**
    * If number of needed disapprovals is met (including the current one),
    * erase peerdisapproval from the table and disable the node.
    */
  if(itr->disapproved_by.size() >= peers_needed()) {
    peerdisapprovals.erase(itr);
    return disable_node(node);
  }
}

void priveos::activate_node(const nodeinfo& node) {
  const auto node_idx = nodes.find(node.owner.value);
  if(node_idx != nodes.end()) {
    if(!node_idx->is_active) {
      nodes.modify(node_idx, same_payer, [&](auto& info) {
        info.is_active = true;
      });
      
      auto stats = global_singleton.get();
      stats.active_nodes += 1;
      global_singleton.set(stats, get_self());
    }
  }
  
  // if there are any incomplete disapprovals, clear them out
  const auto itr = peerdisapprovals.find(node.owner.value);
  if(itr != peerdisapprovals.end()) {
    peerdisapprovals.erase(itr);
  }
}

void priveos::disable_node(const nodeinfo& node) {
  const auto node_idx = nodes.find(node.owner.value);
  if(node_idx != nodes.end()) {
    if(node_idx->is_active) {
      nodes.modify(node_idx, same_payer, [&](auto& info) {
        info.is_active = false;
      });
      
      auto stats = global_singleton.get();
      stats.active_nodes -= 1;
      global_singleton.set(stats, get_self());
    }
  }
  
  // if there are any incomplete approvals, clear them out
  const auto itr = peerapprovals.find(node.owner.value);
  if(itr != peerapprovals.end()) {
    peerapprovals.erase(itr);
  }
}

uint32_t priveos::peers_needed() {
  auto stats = global_singleton.get();
  return stats.active_nodes/2 + 1;
}
