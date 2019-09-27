<h1 class="contract">regnode</h1>

---
spec_version: "0.2.0"
title: Register as a Node Operator
summary: 'Register {{nowrap owner}} account as a node operator'
icon: https://ipfs.eternum.io/ipfs/QmaiQujFe2U6padXesF9ehcMvKgc2zf24ZkFVhRoyXdWFc/priveos.png#e62d312e69b5b1cd46894e147e87a82dad3d181087b72de9c2c084077bd82aef
---

{{owner}} registers or updates itself as a node on the priveos network.

It is required to additionally set a {{node_key}} (public key) used for encryption in information exchange as well as a {{url}} pointing to its broker component.

## Unknown/new node
In case the node was not previously registered within the contract, default values are attached to it:

1. the node will be set to inactive
1. the node is initialized with a bond of 0

In case the node has been successfully added to the table, the global stats for registered nodes are increased by 1.

In case that the node does not have a balance entry in the nodetoken_balances table yet, an entry is created with funds set to 0.

Finally, the registration fee is charged by calling the actions `sub_balance` as well as `add_fee_balance`.

## Node known already/Update mechanism
In case the {{owner}} is already stored inside the nodes table, the properties {{url}} and {{node_key}} are updated based on the action parameters. Additionally, the properties `wants_to_leave` and `cleared_for_leaving` are overwritten and set to false to indicate, that the node does no longer want to leave the system.

<h1 class="contract">unregnode</h1>

---
spec_version: "0.2.0"
title: Indicate the wish to unregister as node operator
summary: '{{nowrap owner}} no longer wants to be a node operator'
icon: https://ipfs.eternum.io/ipfs/QmaiQujFe2U6padXesF9ehcMvKgc2zf24ZkFVhRoyXdWFc/priveos.png#e62d312e69b5b1cd46894e147e87a82dad3d181087b72de9c2c084077bd82aef
---

'{{nowrap owner}} no longer wants to be a node operator on the privEOS network.
Sets the node to inactive (is_active -> false) and sets the flag wants_to_leave to true.