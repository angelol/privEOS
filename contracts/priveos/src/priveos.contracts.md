<h1 class="contract">regnode</h1>

---
spec_version: "0.2.0"
title: Register as a Node Operator
summary: 'Register {{nowrap owner}} account as a node operator'
icon: https://ipfs.eternum.io/ipfs/QmaiQujFe2U6padXesF9ehcMvKgc2zf24ZkFVhRoyXdWFc/priveos.png#e62d312e69b5b1cd46894e147e87a82dad3d181087b72de9c2c084077bd82aef
---

Register {{owner}} account as a node operator on the privEOS network.

<h1 class="contract">unregnode</h1>

---
spec_version: "0.2.0"
title: Indicate the wish to unregister as node operator
summary: '{{nowrap owner}} no longer wants to be a node operator'
icon: https://ipfs.eternum.io/ipfs/QmaiQujFe2U6padXesF9ehcMvKgc2zf24ZkFVhRoyXdWFc/priveos.png#e62d312e69b5b1cd46894e147e87a82dad3d181087b72de9c2c084077bd82aef
---

'{{nowrap owner}} no longer wants to be a node operator on the privEOS network.
Sets the node to inactive (is_active -> false) and sets the flag wants_to_leave to true.