const http = require('http')
const config = require('./config')
const eosjs_ecc = require('eosjs-ecc')
const ByteBuffer = require('bytebuffer')
const fs = require('fs')
const assert = require('assert')


function main() {
  secure_permissions()
  create_lookup_table()
  start_server()
}

/**
  * The config file contains the private key
  * and should not be world-readable.
  * If the permissions are wrong, we fix them here and now.
  */
function secure_permissions() {
  const config_path = "config.js"
  const stat = fs.statSync(config_path)
  if(stat.mode != 33152) {
    fs.chmod(config_path, 0o600, () => {
      console.log("Setting permissions of config.js to 600")
    })  
  }
}


/**
  * Create a lookup table so we can look up old
  * private keys by their public key
  */
function create_lookup_table() {
  config.keys = config.oldKeys.reduce((a, b) => {
    const public_key = eosjs_ecc.privateToPublic(b)
    a[public_key] = b
    return a
  }, {})
}

function start_server() {
  http.createServer((request, response) => {
    const { headers, method, url } = request
    let chunks = []
    request.on('error', (err) => {
      console.error(err)
      response.statusCode = 400
      response.end()
    }).on('data', (chunk) => {
      chunks.push(chunk)
    }).on('end', () => {
      const body = Buffer.concat(chunks).toString()
      console.log("url: ", url)
      console.log("Body: ", body)
      
      const payload = JSON.parse(body)
      
      if(url == '/reencrypt/') {
        try {
          reencrypt(payload, response)
        } catch(e) {
          console.log(e)
          response.statusCode = 500;
          response.write("Internal Server Error")
        }
      } 
      else {
        response.statusCode = 404;
        response.write("Not found")
      }
      response.end()
    })
  }).listen(config.listenPort, "127.0.0.1")
}

function reencrypt(payload, response) {
  const node_public_key = payload.share.public_key
  console.log("node_public_key: ", node_public_key)
  const private_key = config.keys[node_public_key]
  assert.ok(private_key, "Private Key not found")
  
  const plaintext = eosjs_ecc.Aes.decrypt(private_key, payload.public_key, payload.share.nonce, ByteBuffer.fromHex(payload.share.message).toBinary(), payload.share.checksum)
  console.log(`Decrypt result" "${String(plaintext)}"`)
  
  const share = eosjs_ecc.Aes.encrypt(config.currentPrivateKey, payload.recipient_public_key, String(plaintext))	

  const json = JSON.stringify({
    message: share.message.toString('hex'),
    nonce: String(share.nonce),
    checksum: share.checksum,
  })
  console.log(`Encrypt result: "${json}"`)
  response.setHeader('Content-Type', 'application/json')
  response.write(json)
  
}

main()
