const secrets = require('secrets.js-grempe');
const nacl = require("tweetnacl");
nacl.util = require('tweetnacl-util');
const assert = require('assert');
const axios = require('axios');
const ByteBuffer = require('bytebuffer');
const fs = require('fs');
const Eos = require('eosjs');
const eosjs_ecc = require('eosjs-ecc');
const Promise = require("bluebird");

const httpEndpoint = 'http://localhost:8888';
const chainId = 'cf057bbfb72640471fd910bcb67639c22df9f92470936cddc1ade0e2f2e7dc4f';

const key = fs.readFileSync('key.txt', {encoding: 'utf8'});
const keyProvider = [key];
const eos = Eos({httpEndpoint, chainId, keyProvider});
const contract = 'priveosrules';

function get_nodes() {
  return ["testnode1", "testnode2", "testnode3", "testnode4", "testnode5"];
}

async function get_public_key(account_name, perm_name) {
  const x = await eos.getAccount(account_name);
  for (const perm of x.permissions) {
    // console.log(perm.perm_name);
    if(perm.perm_name == perm_name) {
      return perm.required_auth.keys[0].key;
    }
  }
}


function get_threshold(N) {
  return 2;
  return Math.floor(N/2) + 1;
}

async function store(owner, file) {  
  const secret = Buffer.from(nacl.randomBytes(nacl.secretbox.keyLength)).toString('hex');
  const nonce = Buffer.from(nacl.randomBytes(nacl.secretbox.nonceLength)).toString('hex');
  console.log("Secret: ", secret);
  console.log("Nonce: ", nonce);
  const shared_secret = secret + nonce;
  console.log("shared_secret: ", shared_secret);
  
  const nodes = get_nodes();
  
  console.log("Nodes: ", nodes);

  
  const shares = secrets.share(shared_secret, nodes.length, get_threshold(nodes.length));
  console.log("Shares: ", shares);
  
  return Promise.map(nodes, async (x) => {
    const public_key = await get_public_key(x, 'active');
    const share = await eosjs_ecc.Aes.encrypt(key, public_key, shares.pop());
    
    return Promise.props({
      node: x, 
      message: share.message.toString('hex'),
      nonce: String(share.nonce),
      checksum: share.checksum,
      public_key: public_key
    });
  }).then((encrypted_shares) => {
    console.log("encrypted_shares: ", JSON.stringify(encrypted_shares));
    
    var data = {};
    for(var i=0; i < encrypted_shares.length; i++) {
      const x = encrypted_shares[i];
      data[x.node] = {
        message: x.message,
        nonce: x.nonce,
        checksum: x.checksum,
        public_key: x.public_key
      }
    }
    
    
    
    return eos.transaction(
      {
        actions: [
          {
            account: contract,
            name: 'store',
            authorization: [{
              actor: owner,
              permission: 'active'
            }],
            data: {
              owner: owner,
              file: file,
              data: JSON.stringify(data)
            }
          }
        ]
      }
    )
  }).then((data) => {
    console.log("Successfully stored in blockchain txid: ", data.transaction_id);
    return [secret, nonce];
  }).catch((e) => {
    console.log("Error ", e);
  });
  
  
  
  
  
}

function read(file) {
  const private_key = '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3';
  
  return axios.post('http://localhost:4000/read/', {
    file: file,
    requester: owner
  }).then(function (response) {
    const shares = response.data;
    // console.log(data);
    
    
    const decrypted_shares = shares.map((data) => {
      return String(eosjs_ecc.Aes.decrypt(private_key, data.public_key, data.nonce, ByteBuffer.fromHex(data.message).toBinary(), data.checksum));
    });
    return decrypted_shares;
  })
  .then((decrypted_shares) => {
    return secrets.combine(decrypted_shares);
  })
  .then((combined) => {
    // console.log(combined);
    const combined_hex_key = combined.slice(0, nacl.secretbox.keyLength*2);
    const combined_hex_nonce = combined.slice(nacl.secretbox.keyLength*2);
    // console.log("Hex key: ", combined_hex_key);
    // console.log("Nonce: ", combined_hex_nonce);
    return [combined_hex_key, combined_hex_nonce];
  })
  .catch(function (error) {
    console.log(error);
  });
  
}


const owner = 'angelo';
const file = process.argv[2];
const data = process.argv[3];




function test() {
  store(owner, file, data)
  .then((x) => {
    console.log("Successfully stored file, now off to reading.");
    read(file)
    .then((y) => {
      assert.strictEqual(x[0], y[0]);
      assert.strictEqual(x[1], y[1]);
      
      console.log("Success!");

      console.log("Original key: ", x[0]);
      console.log("Original nonce: ", x[1]);
      console.log("Reconstructed key: ", y[0]);
      console.log("Reconstructed key: ", y[1]);
    });
  });
  
}
test();
