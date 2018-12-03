const http = require('http');
const config = require('./config')

http.createServer((request, response) => {
  const { headers, method, url } = request;
  let chunks = [];
  request.on('error', (err) => {
    console.error(err);
  }).on('data', (chunk) => {
    chunks.push(chunk);
  }).on('end', () => {
    const body = Buffer.concat(chunks).toString();
    console.log("url: ", url)
    console.log("Body: ", body)
    
    const payload = JSON.parse(body)
    
    if(url == '/encrypt/') {
      encrypt(payload, response)
    } else if(url == '/decrypt/') {
      decrypt(payload, response)
    }
  });
}).listen(config.listenPort, "127.0.0.1");

function encrypt(payload, response) {
  /*
    Depends on:
    public_key of recipient as String,
    plaintext message (to be encrypted for above recipient) as String
  */
  console.log(`privateKey: "${config.privateKey}"`)
  
  const share = eosjs_ecc.Aes.encrypt(config.privateKey, payload.public_key, payload.plaintext)	


  console.log(`Encrypt result: "${share}"`)
  response.write(share)
  response.end()
}

function decrypt(payload, response) {
  /*
    Depends on:
    public_key of the sender as String,
    message as hex String,
    nonce as String,
    checksum as String,
  */
  const plaintext = eosjs_ecc.Aes.decrypt(config.privateKey, payload.public_key, payload.nonce, ByteBuffer.fromHex(payload.message).toBinary(), payload.checksum)
  console.log(`Decrypt result" "${plaintext}"`)
  response.write(plaintext)
  response.end()
}
